import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import type { BusinessContext } from './businessContext'

dotenv.config()

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

// Helper function to handle transient rate-limiting (429 / RESOURCE_EXHAUSTED) gracefully with backoff
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 4, initialDelayMs = 2000): Promise<T> {
  let attempt = 0
  let delay = initialDelayMs
  while (attempt < maxRetries) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      
      const errStr = JSON.stringify(err) || ''
      const errMsg = err?.message || ''
      const errStatus = err?.status || 0
      
      const isRateLimit = errStatus === 429 || 
                          errMsg.includes('429') || 
                          errMsg.includes('quota') || 
                          errMsg.includes('Quota') || 
                          errMsg.includes('RESOURCE_EXHAUSTED') ||
                          errStr.includes('429') ||
                          errStr.includes('RESOURCE_EXHAUSTED')

      if (isRateLimit && attempt < maxRetries) {
        console.warn(`[Gemini API Rate Limit] Hit 429/quota limits. Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2 // exponential backoff
        continue
      }
      throw err
    }
  }
  throw new Error('Gemini API rate limit retry limit reached')
}

export function buildSystemInstruction(context: any): string { 
  const topExpense = context?.topExpenseCategories?.[0]
  const topIncome = context?.topIncomeSources?.[0]
  const totalTransactions = context?.transactionCount ?? context?.receiptCount ?? 0

  return `You are BizBuddy, an AI financial advisor for small business owners in India. Give clear, practical, encouraging advice in plain language — no jargon. Always use ₹ for currency. When relevant, reference Indian schemes like MUDRA loans, PM SVANidhi, and GST filing.

Here is the business owner's real financial data from the last 30 days:
- Total income: ₹${(context?.totalIncome || 0).toLocaleString('en-IN')}
- Total expenses: ₹${(context?.totalExpenses || 0).toLocaleString('en-IN')}
- Net profit: ₹${(context?.netProfit || 0).toLocaleString('en-IN')}
- Top expense category: ${topExpense ? `${topExpense.category} (₹${topExpense.amount.toLocaleString('en-IN')})` : 'no data yet'}
- Top income source: ${topIncome ? `${topIncome.source} (₹${topIncome.amount.toLocaleString('en-IN')})` : 'no data yet'}
- Transactions recorded: ${totalTransactions}

Base your answers on these real numbers whenever the question relates to their finances. If they haven't logged enough data yet, gently encourage them to add expenses/income so you can give sharper advice. Keep replies concise — a few short paragraphs or a short list, not an essay.`
}

export async function generateChatReply(history: ChatTurn[], systemInstruction: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const trimmed = [...history]
  while (trimmed.length && trimmed[0].role === 'assistant') {
    trimmed.shift()
  }

  const contents = trimmed.map((turn) => ({
    role: turn.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: turn.content }],
  }))

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction },
    })
  )

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }
  return text
}

export async function generateMarketingOptions(platform: string, festival: string, prompt: string): Promise<any> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const systemInstruction = `You are a creative social media marketing manager. Your job is to generate three distinct versions of a marketing post for a small business owner, along with visual banner design metadata to make it highly attractive.
  The versions should be:
  1. "Standard / Good": A standard, warm, friendly post suitable for any occasion.
  2. "Creative / Perfect": A highly engaging, emotional, and persuasive post with creative storytelling elements.
  3. "Short / Hype": A punchy, urgent, high-energy post focused on quick conversions/sales.

  Return a JSON object containing a "versions" array, where each element has:
  - "style": One of the three style names above.
  - "content": The generated post text (including suitable emojis, formatted with clean spacing).
  - "hashtags": An array of 3-5 relevant hashtags (do not include the '#' character in the strings).
  - "banner": An object containing design fields for a visual ad card:
    - "headline": A short, punchy, capitalized title (2-4 words, e.g. "DIWALI SPECIAL", "MEGA SALE", "NEW ARRIVALS").
    - "subheadline": A brief catchphrase (3-6 words, e.g., "Light up your celebrations", "Up to 30% discount inside").
    - "promoTag": A brief badge text (e.g. "20% OFF", "LIMITED OFFER", "SHOP NOW").`

  const userContent = `Platform: ${platform}
  Festival/Occasion: ${festival || 'None'}
  Custom instructions: ${prompt || 'None'}`

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    })
  )

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  return JSON.parse(text)
}

export async function generateText(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })
  )
  return response.text || ''
}