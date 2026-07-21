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
import seedRoutes from './routes/seed'

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
    
    // Check if the origin matches our allowed list or ends with known hosting domains
    const isAllowed = allowedOrigins.includes(origin) 
      || origin.endsWith('.vercel.app')
      || origin.endsWith('.catalystserverless.com')
      || origin.endsWith('.catalystserverless.in')
      || origin.endsWith('.catalystapps.com')
      || origin.endsWith('.catalystapps.in');
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
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

app.use('/uploads', express.static(UPLOADS_DIR))
app.use(express.urlencoded({ extended: true }))

// Normalize req.url for Catalyst Advanced IO serverless routing
app.use((req, _res, next) => {
  if (req.url.startsWith('/server/bizbuddy-backend')) {
    req.url = req.url.replace('/server/bizbuddy-backend', '') || '/'
  }
  next()
})

// Apply routes
app.use('/api/expenses',  authMiddleware, expenseRoutes)
app.use('/api/income',    authMiddleware, incomeRoutes)
app.use('/api/receipts',  authMiddleware, receiptRoutes)
app.use('/api/ai',        authMiddleware, aiRoutes)
app.use('/api/reports',   authMiddleware, reportRoutes)
app.use('/api/marketing', authMiddleware, marketingRoutes)
app.use('/api/website',   authMiddleware, websiteRoutes)
app.use('/api/dashboard', authMiddleware, dashboardRoutes)
app.use('/api/seed',      authMiddleware, seedRoutes)

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

// In Catalyst serverless, we export the app handler.
// In local dev, we start the HTTP server safely inside try-catch.
const isMain = require.main === module
const isCatalyst = process.env.CATALYST_ENVIRONMENT || process.env.X_ZOHO_CATALYST_IS_CATALYST_ENV || process.env.CATALYST_ENV || process.env.X_ZOHO_CATALYST_IS_LOCAL
if (isMain && !isCatalyst) {
  const server = app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`)
  })
  server.on('error', (err) => {
    console.log('Server listen warning:', err.message)
  })
}

const handler = (req: any, res: any) => {
  return app(req, res)
}

module.exports = handler
module.exports.default = handler
module.exports.app = app