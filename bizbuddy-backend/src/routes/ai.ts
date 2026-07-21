import { Router } from 'express'
import { AuthRequest } from '../middleware/auth'
import { generateChatReply, buildSystemInstruction, generateMarketingOptions } from '../services/gemini'
import { getBusinessContext } from '../services/businessContext'

const router = Router()

router.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { messages } = req.body
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' })
    }

    // Safety check: Ensure functions were imported correctly from your services
    if (typeof generateChatReply !== 'function' || typeof buildSystemInstruction !== 'function') {
      throw new Error('Gemini service functions are not loaded correctly. Check your imports/exports.')
    }

    // 1. Fetch data safely using the authenticated user's ID
    const context = await getBusinessContext(req.uid!)
    
    // 2. Generate the background instructions for the AI
    const systemInstruction = buildSystemInstruction(context)
    
    // 3. Request the message completion from Gemini
    const reply = await generateChatReply(messages, systemInstruction)

    res.json({ success: true, data: { content: reply } })
  } catch (err) {
    console.error('AI chat error:', err)
    const detail = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'AI service error' : `AI service error: ${detail}`,
    })
  }
})

router.get('/business-health', async (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: {
      score: 72,
      insights: [
        'Revenue growing 12% month over month',
        'Expense ratio is healthy at 63%',
        'Consider diversifying income sources',
      ],
    },
  })
})

router.post('/marketing', async (req: AuthRequest, res) => {
  try {
    const { platform, festival, prompt } = req.body
    const options = await generateMarketingOptions(platform || 'instagram', festival || '', prompt || '')
    res.json({
      success: true,
      data: options
    })
  } catch (err) {
    console.error('Marketing generation error:', err)
    res.status(500).json({ success: false, error: 'Could not generate marketing post options' })
  }
})

router.post('/website', async (req: AuthRequest, res) => {
  const { businessName, description, theme } = req.body
  res.json({
    success: true,
    data: {
      id:           Date.now().toString(),
      businessName: businessName || 'My Business',
      tagline:      'Your trusted local business',
      description:  description || 'We provide quality products and services',
      theme:        theme || 'modern',
      primaryColor: '#16a34a',
      products:     req.body.products || [],
      contactInfo:  { phone: '', address: '' },
      socialLinks:  {},
      publishedUrl: null,
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    },
  })
})

export default router