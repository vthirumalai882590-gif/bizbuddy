import { loadExpenses, loadIncome } from './database'

export interface BusinessContext {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  topExpenseCategories: { category: string; amount: number }[]
  topIncomeSources: { source: string; amount: number }[]
  transactionCount: number
}

export async function getBusinessContext(uid: string): Promise<BusinessContext> {
  const expenses = await loadExpenses(uid)
  const income = await loadIncome(uid)

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0)
  const netProfit = totalIncome - totalExpenses

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

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    topExpenseCategories,
    topIncomeSources,
    transactionCount: expenses.length + income.length,
  }
}