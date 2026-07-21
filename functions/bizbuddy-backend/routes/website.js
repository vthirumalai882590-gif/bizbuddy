"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("../services/database");
dotenv_1.default.config();
const router = (0, express_1.Router)();
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// GET: Fetch saved website configuration
router.get('/', async (req, res) => {
    const userId = req.uid || 'demo-user';
    const config = await (0, database_1.loadWebsiteConfig)(userId);
    res.json({ success: true, data: config });
});
// POST: Generate a highly unique, customized website framework using Gemini
router.post('/', async (req, res) => {
    const userId = req.uid || 'demo-user';
    try {
        const { businessName, description, theme, products } = req.body;
        if (!description) {
            return res.status(400).json({ success: false, error: 'Business description is required' });
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
    }`;
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: `Business Name: ${businessName || 'Local Business'}\nTheme Style: ${theme || 'Vibrant'}\nDescription: ${description}`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json'
            }
        });
        const text = response.text;
        if (!text)
            throw new Error('AI failed to generate a design structure.');
        const websiteConfig = JSON.parse(text);
        const savedConfig = {
            id: Date.now().toString(),
            ...websiteConfig,
            products: products || [],
            createdAt: new Date().toISOString()
        };
        await (0, database_1.saveWebsiteConfig)(savedConfig, userId);
        res.json({
            success: true,
            data: savedConfig
        });
    }
    catch (err) {
        console.error('Website generation error:', err);
        const detail = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ success: false, error: `Failed to create website blueprint: ${detail}` });
    }
});
// PUT: Save manual edits back down to the workspace
router.put('/', async (req, res) => {
    const userId = req.uid || 'demo-user';
    const savedConfig = { ...req.body, updatedAt: new Date().toISOString() };
    await (0, database_1.saveWebsiteConfig)(savedConfig, userId);
    res.json({
        success: true,
        data: savedConfig
    });
});
// POST: Simulate publishing the blueprint to a preview URL
router.post('/publish', async (req, res) => {
    const siteId = req.body.id || 'demo';
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    res.json({
        success: true,
        data: { publishedUrl: `${protocol}://${host}/site/${siteId}` }
    });
});
exports.default = router;
