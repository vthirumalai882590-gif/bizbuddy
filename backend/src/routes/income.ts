import { Router } from 'express'
import { loadIncome, saveIncome } from '../services/database'

const router = Router()

router.get('/', async (req: any, res: any) => {
  const income = loadIncome()
  res.json({ success: true, data: income })
})

router.post('/', async (req: any, res: any) => {
  const income = loadIncome()
  const newIncome = {
    id: Date.now().toString(),
    userId: 'demo',
    currency: 'INR',
    amount: Number(req.body.amount) || 0,
    source: req.body.source || 'sales',
    description: req.body.description || 'Counter Sales',
    date: req.body.date || new Date().toISOString().split('T')[0],
    customer: req.body.customer || 'Walk-in',
    paymentMethod: req.body.paymentMethod || 'upi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  income.unshift(newIncome)
  saveIncome(income)
  res.json({ success: true, data: newIncome })
})

router.delete('/:id', async (req: any, res: any) => {
  let income = loadIncome()
  const initialLength = income.length
  income = income.filter(i => i.id !== req.params.id)
  if (income.length !== initialLength) {
    saveIncome(income)
    return res.json({ success: true, message: 'Income record pruned successfully' })
  }
  res.status(404).json({ success: false, error: 'Target record row not found' })
})

export default router