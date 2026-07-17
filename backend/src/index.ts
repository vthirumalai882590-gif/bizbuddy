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
import { authMiddleware } from './middleware/auth'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5000',
      'http://localhost:5001'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or postman requests (no origin)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches our allowed list or ends with .vercel.app
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy blocked request from origin: ${origin}`));
    }
  },
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
app.use('/api/expenses',  authMiddleware, expenseRoutes)
app.use('/api/income',    authMiddleware, incomeRoutes)
app.use('/api/receipts',  authMiddleware, receiptRoutes)
app.use('/api/ai',        authMiddleware, aiRoutes)
app.use('/api/reports',   authMiddleware, reportRoutes)
app.use('/api/marketing', authMiddleware, marketingRoutes)
app.use('/api/website',   authMiddleware, websiteRoutes)
app.use('/api/dashboard', authMiddleware, dashboardRoutes)

app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve frontend static assets in production
const frontendDistPath = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath))
  app.get('*', (req: any, res: any, next: any) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next()
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`)
})

module.exports = app // <-- Kept as CommonJS export