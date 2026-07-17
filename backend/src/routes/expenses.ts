import { Router } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { loadExpenses, saveExpenses, loadIncome } from '../services/database'
import { generateChatReply, ChatTurn, generateText } from '../services/gemini'

const router = Router()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ─── GET: LIST METRICS ───────────────────────────────────────────────
router.get('/', async (req: any, res: any) => {
  const expenses = await loadExpenses(req.uid)
  res.json({ success: true, data: expenses })
})

// ─── POST: APPEND NEW MANUAL ENTRY ───────────────────────────────────
router.post('/', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  const expenses = await loadExpenses(userId)
  const newExpense = {
    id: Date.now().toString(),
    userId: userId,
    currency: 'INR',
    amount: Number(req.body.amount) || 0,
    category: req.body.category || 'other',
    description: req.body.description || '',
    date: req.body.date || new Date().toISOString().split('T')[0],
    vendor: req.body.vendor || 'Direct Cash Purchases',
    paymentMethod: req.body.paymentMethod || 'cash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  expenses.unshift(newExpense)
  await saveExpenses(expenses, userId)
  res.json({ success: true, data: newExpense })
})

// ─── PUT: RECORD MUTATION UPDATE ─────────────────────────────────────
router.put('/:id', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  const expenses = await loadExpenses(userId)
  const index = expenses.findIndex(e => e.id === req.params.id)
  if (index !== -1) {
    expenses[index] = {
      ...expenses[index],
      ...req.body,
      amount: Number(req.body.amount) ?? expenses[index].amount,
      updatedAt: new Date().toISOString()
    }
    await saveExpenses(expenses, userId)
    return res.json({ success: true, data: expenses[index] })
  }
  res.status(404).json({ success: false, error: 'Target transaction row missing' })
})

// ─── DELETE: PRUNE RECORD ROW ────────────────────────────────────────
router.delete('/:id', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  let expenses = await loadExpenses(userId)
  const initialLength = expenses.length
  expenses = expenses.filter(e => e.id !== req.params.id)
  
  if (expenses.length !== initialLength) {
    await saveExpenses(expenses, userId)
    return res.json({ success: true, message: 'Expense record pruned successfully' })
  }
  res.status(404).json({ success: false, error: 'Target record row not found' })
})

// ─── GET: AI INSIGHT ENGINE STRATEGY ──────────────────────────────────
router.get('/ai-coach', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Gemini access configuration missing' })
    }

    const expenses = await loadExpenses(userId)
    const totalInvestment = expenses.reduce((sum, e) => sum + e.amount, 0)
    const inventoryCosts = expenses.filter(e => e.category === 'inventory').reduce((sum, e) => sum + e.amount, 0)
    
    const vendorSummary = expenses.reduce((acc: Record<string, number>, e) => {
      const v = e.vendor || 'Other'
      acc[v] = (acc[v] || 0) + e.amount
      return acc
    }, {})

    const categorySummary = expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})

    const incomes = await loadIncome(userId)
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
    const netProfit = totalIncome - totalInvestment

    const prompt = `You are a warm, helpful local business coach talking to a roadside merchant or street vendor. 
    Analyze their recent cash metrics:
    - Total Money Invested (Outflows): ₹${totalInvestment}
    - Total Income (Inflows): ₹${totalIncome}
    - Net Profit / Margin: ₹${netProfit}
    - Amount Spent on Raw Materials/Inventory Restock: ₹${inventoryCosts}
    - Expense Breakdown by Category: ${JSON.stringify(categorySummary)}
    - Specific Vendor Outflow Breakdown: ${JSON.stringify(vendorSummary)}

    Give them direct, actionable feedback in 3 simple bullet points using plain text. 
    1. Assess their financial health (income vs investment, net profit margins).
    2. Pinpoint category overspending (e.g. if rent, electricity, marketing or salaries are too high compared to inventory).
    3. Suggest which stock or category to prioritize based on their budget and business type to optimize turnover.
    Speak in a clear, friendly, and practical manner.`

    const adviceText = await generateText(prompt)
    
    res.json({ success: true, advice: adviceText })
  } catch (err: any) {
    console.error('AI Coaching exception:', err)
    
    // Rule-based offline fallback when API key hits quota limit
    const expenses = await loadExpenses(userId)
    const totalInvestment = expenses.reduce((sum, e) => sum + e.amount, 0)
    const inventoryCosts = expenses.filter(e => e.category === 'inventory').reduce((sum, e) => sum + e.amount, 0)
    const incomes = await loadIncome(userId)
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
    const netProfit = totalIncome - totalInvestment
    const margin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(0) : '0'
    const categoryTotals = Object.entries(
      expenses.reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1])
    const topCat = categoryTotals[0]?.[0] || 'other'
    const topCatAmount = categoryTotals[0]?.[1] || 0

    const fallbackAdvice = `Based on your business performance:

* **${netProfit >= 0 ? 'Profitable Position' : 'Loss Prevention Opportunity'}**: Your net profit is ₹${netProfit.toLocaleString('en-IN')} (margin of ${margin}%). ${netProfit >= 0 ? 'You are maintaining a positive margin!' : 'Review pricing markup to avoid selling at a loss.'}
* **${inventoryCosts / (totalInvestment || 1) > 0.6 ? 'High Stock Allocation' : 'Balanced Outflow'}**: Inventory accounts for ${totalInvestment > 0 ? ((inventoryCosts/totalInvestment)*100).toFixed(0) : '0'}% of your budget. ${inventoryCosts / (totalInvestment || 1) > 0.6 ? 'Try negotiating bulk rates to release cash flow.' : 'Your stock replenishment levels look balanced.'}
* **Cost Center Review**: Your highest category is **${topCat.replace('_', ' ')}** at ₹${topCatAmount.toLocaleString('en-IN')}. Focus on auditing these outlays first to maximize return on assets.

*(Smart Advisor Offline Mode: AI Key Quota Exceeded. Displaying rule-based smart insights)*`

    res.json({ success: true, advice: fallbackAdvice })
  }
})

// ─── POST: INTERACTIVE AI CHAT ASSISTANT FOR LIVE DATA ──────────────
router.post('/chat', async (req: any, res: any) => {
  const userId = req.uid || 'demo-user'
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Gemini configuration missing' })
    }

    const message = req.body.message || ''
    const promptContext = req.body.context || ''
    const history = (req.body.history || []) as ChatTurn[]

    const expenses = await loadExpenses(userId)
    const totalInvestment = expenses.reduce((sum, e) => sum + e.amount, 0)
    const inventoryCosts = expenses.filter(e => e.category === 'inventory').reduce((sum, e) => sum + e.amount, 0)

    const incomes = await loadIncome(userId)
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
    const netProfit = totalIncome - totalInvestment

    const systemInstruction = `You are a warm, street-smart business coach helping a retail vendor.
    Here is their live financial ledger status:
    - Total Invested (Expenses): ₹${totalInvestment}
    - Total Inflow (Income): ₹${totalIncome}
    - Net Profit: ₹${netProfit}
    - Inventory Cost: ₹${inventoryCosts}
    Additional Client Math Metadata Matrix: ${promptContext}

    Provide a short, friendly, and highly actionable response (maximum 2-3 sentences) directly answering their business problem.`

    const chatHistory = history.length > 0 ? history : [{ role: 'user' as const, content: message }]
    const reply = await generateChatReply(chatHistory, systemInstruction)
    
    res.json({ 
      success: true, 
      reply: reply 
    })
  } catch (err) {
    console.error('Chat routing error:', err)
    
    // Offline local chat fallback
    const message = req.body.message || ''
    const expenses = await loadExpenses(userId)
    const totalInvestment = expenses.reduce((sum, e) => sum + e.amount, 0)
    const incomes = await loadIncome(userId)
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
    const netProfit = totalIncome - totalInvestment

    let reply = `Namaste! I am currently running in Offline Mode because the AI service is experiencing heavy traffic. 

Here is your quick financial status:
- Total Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${totalInvestment.toLocaleString('en-IN')}
- Net Profit: ₹${netProfit.toLocaleString('en-IN')}

Could you ask that again in a few minutes when the AI connection is restored?`

    res.json({ 
      success: true, 
      reply: reply 
    })
  }
})

export default router