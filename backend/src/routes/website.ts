import { Router } from 'express'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// GET: Fetch saved website configuration
router.get('/', async (req: any, res: any) => {
  // In a full application, you would fetch this from Firestore using req.uid
  res.json({ success: true, data: null })
})

// POST: Generate a highly unique, customized website framework using Gemini
router.post('/', async (req: any, res: any) => {
  try {
    const { businessName, description, theme, products } = req.body

    if (!description) {
      return res.status(400).json({ success: false, error: 'Business description is required' })
    }

    const systemPrompt = `You are an expert web designer and copywriter. Generate a stunning, highly professional website structure configuration based on the user's business details.
    Analyze the requested theme design aesthetic: "${theme || 'Modern'}".
    
    You must output ONLY a valid JSON object matching this exact schema layout without markdown blocks:
    {
      "businessName": "string",
      "tagline": "string",
      "design": {
        "primaryColor": "Hex Code string matching business vibe and requested theme",
        "secondaryColor": "Hex Code string for crisp button/accent details",
        "bgGradient": "CSS linear gradient background string (e.g., 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)')",
        "fontFamily": "sans-serif | serif | monospace"
      },
      "hero": {
        "title": "A highly creative, premium hook headline",
        "subtitle": "An alluring, professional sub-headline"
      },
      "about": "Engaging, high-converting copywriting story about the business value",
      "contact": {
        "phone": "Generate a clean, professional, realistic mobile or landline phone number formatted for the business location",
        "address": "Generate a specific, highly realistic local physical shop/business address contextually matching any city or area noted in the user description"
      }
    }`

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Business Name: ${businessName || 'Local Business'}\nTheme Style: ${theme || 'Vibrant'}\nDescription: ${description}`,
      config: {
        systemInstruction: systemPrompt,
        // Enforce a strict JSON response back from Gemini
        responseMimeType: 'application/json'
      }
    })

    const text = response.text
    if (!text) throw new Error('AI failed to generate a design structure.')

    // Parse the string response back into a true JSON object
    const websiteConfig = JSON.parse(text)

    res.json({
      success: true,
      data: {
        id: Date.now().toString(),
        ...websiteConfig,
        products: products || [], // Pass existing user products straight through to the preview state
        createdAt: new Date().toISOString()
      }
    })

  } catch (err) {
    console.error('Website generation error:', err)
    const detail = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ success: false, error: `Failed to create website blueprint: ${detail}` })
  }
})

// PUT: Save manual edits back down to the workspace
router.put('/', async (req: any, res: any) => {
  res.json({ 
    success: true, 
    data: { ...req.body, updatedAt: new Date().toISOString() } 
  })
})

// POST: Simulate publishing the blueprint to a preview URL
router.post('/publish', async (req: any, res: any) => {
  const siteId = req.body.id || 'demo'
  res.json({ 
    success: true, 
    data: { publishedUrl: `http://localhost:3000/site/${siteId}` } 
  })
})

export default router