import { Router } from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import { loadReceipts, saveReceipts, Receipt } from '../services/database'

const router = Router()

// Maintain export for backward compatibility or imports in other routes
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
  const userId = req.uid || 'demo-user'
  const list = await loadReceipts(userId)
  // Sync the export array just in case other files read it
  receipts = list
  res.json({ success: true, data: list })
})

// ─── POST: INITIAL FILE UPLOAD & BACKGROUND TEXT EXTRACTION ──────────
router.post('/upload', upload.single('receipt'), async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const receipt: Receipt = {
      id:         Date.now().toString(),
      userId:    userId,
      imageUrl:  `http://localhost:5001/uploads/${req.file.filename}`,
      status:    'processing',
      createdAt: new Date().toISOString(),
      _localPath: req.file.path, 
      _mimeType:  req.file.mimetype,
    }

    const list = await loadReceipts(userId)
    list.unshift(receipt)
    await saveReceipts(list, userId)
    receipts = list

    res.json({ success: true, data: receipt })

    // Background process the Gemini Vision extraction asynchronously
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY variable is missing inside the server .env profile")
      }

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

      const updateList = await loadReceipts(userId)
      const index = updateList.findIndex(r => r.id === receipt.id)
      if (index !== -1) {
        updateList[index] = {
          ...updateList[index],
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
        await saveReceipts(updateList, userId)
        receipts = updateList
      }
    } catch (aiError: any) {
      console.error('Gemini Vision exception pipeline loop:', aiError)
      const updateList = await loadReceipts(userId)
      const index = updateList.findIndex(r => r.id === receipt.id)
      if (index !== -1) {
        updateList[index] = { 
          ...updateList[index], 
          status: 'failed',
          errorDetails: aiError.message || 'Parsing failure context'
        }
        await saveReceipts(updateList, userId)
        receipts = updateList
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
  const userId = req.uid || 'demo-user'
  const list = await loadReceipts(userId)
  const receipt = list.find(r => r.id === req.params.id)
  if (!receipt) {
    return res.status(404).json({ success: false, error: 'Receipt context not found' })
  }
  res.json({ success: true, data: receipt })
})

// ─── POST: LINK EXISTING TRANSACTION ─────────────────────────────────
router.post('/:receiptId/link', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  const { expenseId } = req.body
  const list = await loadReceipts(userId)
  const index = list.findIndex(r => r.id === req.params.receiptId)
  if (index !== -1) {
    list[index].linkedExpenseId = expenseId
    await saveReceipts(list, userId)
    receipts = list
  }
  res.json({ success: true, message: 'Receipt linked to expense successfully' })
})

// ─── DELETE: REMOVE TRANSCRIPTION AND DISK STORAGE ───────────────────
router.delete('/:id', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  try {
    const targetId = req.params.id
    const list = await loadReceipts(userId)
    const targetReceipt = list.find(r => r.id === targetId)

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

    const filteredList = list.filter(r => r.id !== targetId)
    await saveReceipts(filteredList, userId)
    receipts = filteredList
    return res.json({ success: true, message: 'Receipt context removed' })
  } catch (err: any) {
    console.error('Destruction middleware crash log:', err)
    return res.status(500).json({ success: false, error: 'Failed to clear local assets' })
  }
})

// ─── POST: MANUAL RETRY FOR FAILED CONTEXT ENTRIES ───────────────────
router.post('/:id/retry', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  try {
    const targetId = req.params.id
    const list = await loadReceipts(userId)
    const index = list.findIndex(r => r.id === targetId)

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Requested receipt context missing' })
    }

    const targetReceipt = list[index]

    if (!targetReceipt._localPath || !fs.existsSync(targetReceipt._localPath)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Original source file asset cleared from storage disk. Please perform a fresh upload.' 
      })
    }

    list[index].status = 'processing'
    await saveReceipts(list, userId)
    receipts = list
    res.json({ success: true, message: 'Worker reprocessing scheduled' })

    try {
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

      const updateList = await loadReceipts(userId)
      const updateIdx = updateList.findIndex(r => r.id === targetId)
      if (updateIdx !== -1) {
        updateList[updateIdx] = {
          ...updateList[updateIdx],
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
        await saveReceipts(updateList, userId)
        receipts = updateList
      }
    } catch (aiError) {
      console.error('Worker tracking failure context recovery exception:', aiError)
      const errList = await loadReceipts(userId)
      const errIdx = errList.findIndex(r => r.id === targetId)
      if (errIdx !== -1) {
        errList[errIdx].status = 'failed'
        await saveReceipts(errList, userId)
        receipts = errList
      }
    }
  } catch (error: any) {
    console.error('Reprocessing route failure:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

export default router