import fs from 'fs'
import path from 'path'

const EXPENSES_PATH = path.join(__dirname, '../../expenses.json')
const INCOME_PATH = path.join(__dirname, '../../income.json')

export interface Expense {
  id: string
  userId: string
  currency: string
  amount: number
  category: string
  description: string
  date: string
  vendor?: string
  paymentMethod: string
  createdAt: string
  updatedAt: string
}

export interface Income {
  id: string
  userId: string
  currency: string
  amount: number
  source: string
  description: string
  date: string
  customer?: string
  paymentMethod: string
  createdAt: string
  updatedAt: string
}

export const loadExpenses = (): Expense[] => {
  try {
    if (fs.existsSync(EXPENSES_PATH)) {
      return JSON.parse(fs.readFileSync(EXPENSES_PATH, 'utf-8'))
    }
  } catch (err) {
    console.error('Error loading expenses:', err)
  }
  return []
}

export const saveExpenses = (data: Expense[]) => {
  try {
    fs.writeFileSync(EXPENSES_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed writing to expenses store:', err)
  }
}

export const loadIncome = (): Income[] => {
  try {
    if (fs.existsSync(INCOME_PATH)) {
      return JSON.parse(fs.readFileSync(INCOME_PATH, 'utf-8'))
    }
  } catch (err) {
    console.error('Error loading income:', err)
  }
  return []
}

export const saveIncome = (data: Income[]) => {
  try {
    fs.writeFileSync(INCOME_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed writing to income store:', err)
  }
}
