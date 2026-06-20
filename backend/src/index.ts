import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Clean TypeScript imports (TypeScript resolves these correctly for CommonJS)
import expenseRoutes from './routes/expenses'
import incomeRoutes from './routes/income'
import receiptRoutes from './routes/receipts'
import aiRoutes from './routes/ai' 
import reportRoutes from './routes/reports'
import marketingRoutes from './routes/marketing'
import websiteRoutes from './routes/website'
import dashboardRoutes from './routes/dashboard'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}))
app.use(express.json())

// Create uploads folder if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

// In CommonJS, __dirname works natively out-of-the-box!
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use(express.urlencoded({ extended: true }))

// Apply routes
app.use('/api/expenses',  expenseRoutes)
app.use('/api/income',    incomeRoutes)
app.use('/api/receipts',  receiptRoutes)
app.use('/api/ai',        aiRoutes)
app.use('/api/reports',   reportRoutes)
app.use('/api/marketing', marketingRoutes)
app.use('/api/website',   websiteRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`)
})

module.exports = app // <-- Kept as CommonJS export