import { Router } from 'express'
import { loadExpenses, loadIncome } from '../services/database'

const router = Router()

router.get('/financial', async (req: any, res: any) => {
  const expenses = loadExpenses()
  const income = loadIncome()

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0)
  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(1)) : 0

  const expenseMap: Record<string, number> = {}
  expenses.forEach((e) => {
    expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount
  })
  const topExpenseCategories = Object.entries(expenseMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const incomeMap: Record<string, number> = {}
  income.forEach((i) => {
    incomeMap[i.source] = (incomeMap[i.source] || 0) + i.amount
  })
  const topIncomeSources = Object.entries(incomeMap)
    .map(([source, amount]) => ({ source, amount }))
    .sort((a, b) => b.amount - a.amount)

  // cash flow weekly/monthly chart generator
  const cashFlow = Array.from({ length: 7 }).map((_, i) => ({
    date: `Week ${i + 1}`,
    income: Math.round(totalIncome * (i + 1) / 7),
    expense: Math.round(totalExpenses * (i + 1) / 7),
    net: Math.round(netProfit * (i + 1) / 7),
  }))

  res.json({
    success: true,
    data: {
      period: req.query.period || 'monthly',
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      topExpenseCategories: topExpenseCategories.length ? topExpenseCategories : [{ category: 'No Entries', amount: 0 }],
      topIncomeSources: topIncomeSources.length ? topIncomeSources : [{ source: 'No Entries', amount: 0 }],
      cashFlow,
    },
  })
})

router.post('/loan-readiness', async (req: any, res: any) => {
  const expenses = loadExpenses()
  const income = loadIncome()

  const totalRevenue = income.reduce((sum, s) => sum + s.amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Assume simple average monthly calculation (divide by 3 or similar)
  const monthlyRevenue = totalRevenue > 0 ? Math.round(totalRevenue / 3) : 0
  const monthlyExpenses = totalExpenses > 0 ? Math.round(totalExpenses / 3) : 0
  const netMonthlyIncome = Math.max(0, monthlyRevenue - monthlyExpenses)

  const expenseRatio = monthlyRevenue > 0 ? (monthlyExpenses / monthlyRevenue) * 100 : 0
  const debtServiceRatio = Math.min(Math.round(expenseRatio * 0.5), 95)
  const eligibleLoanAmount = Math.max(0, netMonthlyIncome * 24)

  let computedScore = 55
  if (expenseRatio < 50) computedScore += 20
  if (expenseRatio >= 50 && expenseRatio < 70) computedScore += 10
  if (netMonthlyIncome > 15000) computedScore += 15
  if (totalRevenue > 100000) computedScore += 10
  const finalScore = Math.min(Math.max(computedScore, 20), 99)

  const grade = finalScore >= 85 ? 'A' : finalScore >= 70 ? 'B' : finalScore >= 55 ? 'C' : 'D'

  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      score: finalScore,
      grade,
      monthlyRevenue,
      monthlyExpenses,
      netMonthlyIncome,
      businessAge: 12, // default business age
      creditUtilization: Math.round(debtServiceRatio * 0.8),
      debtServiceRatio,
      eligibleLoanAmount,
      recommendations: [
        expenseRatio > 65
          ? `Your material/operating costs are high (${expenseRatio.toFixed(0)}% of sales). Raise markup margins.`
          : 'Excellent expense discipline! Keep operations cost overheads locked down under 60%.',
        income.length < 5
          ? 'Log regular daily counter cash entries consistently to build ledger history.'
          : 'Continuous sales logs detected. Your structured record trail improves validation trust.',
      ],
      eligibleSchemes: [
        { name: 'MUDRA Loan – Shishu', provider: 'MUDRA Bank', maxAmount: 50000, interestRate: '8–12%', tenure: '5 years', eligibility: 'New micro businesses', url: 'https://mudra.org.in' },
        { name: 'PM SVANidhi', provider: 'Government', maxAmount: 50000, interestRate: '7%', tenure: '12 months', eligibility: 'Street vendors', url: 'https://pmsvanidhi.mohua.gov.in' },
      ].filter(s => s.maxAmount <= eligibleLoanAmount + 50000),
    },
  })
})

export default router