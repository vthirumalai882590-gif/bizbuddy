import { Router } from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'

const router = Router()
// In-memory runtime database array
export let receipts: any[] = []

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const AI_PROMPT = `You are a receipt scanner. Analyze this receipt image and extract all information.
Return a valid JSON object matching exactly this structure:
{
  "vendor": "store name here",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "item name", "quantity": 1, "unitPrice": 100, "totalPrice": 100}
  ],
  "taxAmount": 0,
  "totalAmount": 500
}
If you cannot read something clearly, make a reasonable estimate.
All prices must be numbers, not strings.`

// ─── GET: LIST SYSTEM RECORDS ────────────────────────────────────────
router.get('/', async (req: any, res: any) => {
  res.json({ success: true, data: receipts })
})

// ─── POST: INITIAL FILE UPLOAD & BACKGROUND TEXT EXTRACTION ──────────
router.post('/upload', upload.single('receipt'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const receipt = {
      id:         Date.now().toString(),
      userId:    'demo-user',
      imageUrl:  `http://localhost:5001/uploads/${req.file.filename}`,
      status:    'processing',
      createdAt: new Date().toISOString(),
      _localPath: req.file.path, // Preserved for retry fallback availability
      _mimeType:  req.file.mimetype,
    }

    receipts.unshift(receipt)
    res.json({ success: true, data: receipt })

    // Background process the Gemini Vision extraction asynchronously
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY variable is missing inside the server .env profile")
      }

      // FIX: Dynamically read your GEMINI_MODEL setting from your .env file
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        generationConfig: { responseMimeType: "application/json" } as any
      })
      
      const fileData = fs.readFileSync(req.file.path)
      const base64Image = fileData.toString('base64')

      const result = await model.generateContent([
        AI_PROMPT,
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: base64Image,
          },
        },
      ])

      const text = result.response.text()
      
      let clean = text.trim()
      if (clean.includes('```')) {
        clean = clean.replace(/```json|```/g, '').trim()
      }
      
      const extractedData = JSON.parse(clean)

      const index = receipts.findIndex(r => r.id === receipt.id)
      if (index !== -1) {
        receipts[index] = {
          ...receipts[index],
          status: 'completed',
          extractedData: {
            vendor:      extractedData.vendor      || 'Unknown Vendor',
            date:        extractedData.date        || new Date().toISOString().split('T')[0],
            items:       extractedData.items       || [],
            taxAmount:   Number(extractedData.taxAmount)   || 0,
            totalAmount: Number(extractedData.totalAmount) || 0,
            amount:      Number(extractedData.totalAmount) || 0,
          },
        }
      }
    } catch (aiError: any) {
      console.error('Gemini Vision exception pipeline loop:', aiError)
      const index = receipts.findIndex(r => r.id === receipt.id)
      if (index !== -1) {
        receipts[index] = { 
          ...receipts[index], 
          status: 'failed',
          errorDetails: aiError.message || 'Parsing failure context'
        }
      }
    }
  } catch (error) {
    console.error('Core routing pipeline upload error:', error)
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ success: false, error: 'Upload process breakdown' })
  }
})

// ─── GET: POLL SINGLE RECEIPT STATUS ─────────────────────────────────
router.get('/:id', async (req: any, res: any) => {
  const receipt = receipts.find(r => r.id === req.params.id)
  if (!receipt) {
    return res.status(404).json({ success: false, error: 'Receipt context not found' })
  }
  res.json({ success: true, data: receipt })
})

// ─── POST: LINK EXISTING TRANSACTION ─────────────────────────────────
router.post('/:receiptId/link', async (req: any, res: any) => {
  const { expenseId } = req.body
  const index = receipts.findIndex(r => r.id === req.params.receiptId)
  if (index !== -1) {
    receipts[index].linkedExpenseId = expenseId
  }
  res.json({ success: true, message: 'Receipt linked to expense successfully' })
})

// ─── DELETE: REMOVE TRANSCRIPTION AND DISK STORAGE ───────────────────
router.delete('/:id', async (req: any, res: any) => {
  try {
    const targetId = req.params.id
    const targetReceipt = receipts.find(r => r.id === targetId)

    if (!targetReceipt) {
      return res.status(404).json({ success: false, error: 'Receipt details matching target missing' })
    }

    if (targetReceipt._localPath && fs.existsSync(targetReceipt._localPath)) {
      try {
        fs.unlinkSync(targetReceipt._localPath)
      } catch (unlinkErr) {
        console.error('Local attachment cleanup warning:', unlinkErr)
      }
    }

    receipts = receipts.filter(r => r.id !== targetId)
    return res.json({ success: true, message: 'Receipt context removed' })
  } catch (err: any) {
    console.error('Destruction middleware crash log:', err)
    return res.status(500).json({ success: false, error: 'Failed to clear local assets' })
  }
})

// ─── POST: MANUAL RETRY FOR FAILED CONTEXT ENTRIES ───────────────────
router.post('/:id/retry', async (req: any, res: any) => {
  try {
    const targetId = req.params.id
    const index = receipts.findIndex(r => r.id === targetId)

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Requested receipt context missing' })
    }

    const targetReceipt = receipts[index]

    if (!targetReceipt._localPath || !fs.existsSync(targetReceipt._localPath)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Original source file asset cleared from storage disk. Please perform a fresh upload.' 
      })
    }

    receipts[index].status = 'processing'
    res.json({ success: true, message: 'Worker reprocessing scheduled' })

    try {
      // FIX: Dynamically read your GEMINI_MODEL setting from your .env file here too
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        generationConfig: { responseMimeType: "application/json" } as any
      })
      
      const fileData = fs.readFileSync(targetReceipt._localPath)
      const base64Image = fileData.toString('base64')

      const result = await model.generateContent([
        AI_PROMPT,
        {
          inlineData: {
            mimeType: targetReceipt._mimeType || 'image/jpeg',
            data: base64Image,
          },
        },
      ])

      const text = result.response.text()
      
      let clean = text.trim()
      if (clean.includes('```')) {
        clean = clean.replace(/```json|```/g, '').trim()
      }
      
      const extractedData = JSON.parse(clean)

      const updateIdx = receipts.findIndex(r => r.id === targetId)
      if (updateIdx !== -1) {
        receipts[updateIdx] = {
          ...receipts[updateIdx],
          status: 'completed',
          extractedData: {
            vendor:      extractedData.vendor      || 'Unknown Vendor',
            date:        extractedData.date        || new Date().toISOString().split('T')[0],
            items:       extractedData.items       || [],
            taxAmount:   Number(extractedData.taxAmount)   || 0,
            totalAmount: Number(extractedData.totalAmount) || 0,
            amount:      Number(extractedData.totalAmount) || 0,
          },
        }
      }
    } catch (aiError) {
      console.error('Worker tracking failure context recovery exception:', aiError)
      const errIdx = receipts.findIndex(r => r.id === targetId)
      if (errIdx !== -1) {
        receipts[errIdx].status = 'failed'
      }
    }
  } catch (error: any) {
    console.error('Reprocessing route failure:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

// FIX: Changed from CommonJS module.exports to clean TypeScript ESM Export
export default router