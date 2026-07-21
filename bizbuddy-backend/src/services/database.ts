import mongoose, { Schema, Model } from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json')
const INCOME_FILE = path.join(DATA_DIR, 'income.json')
const RECEIPTS_FILE = path.join(DATA_DIR, 'receipts.json')
const WEBSITE_FILE = path.join(DATA_DIR, 'website.json')

let isConnecting: Promise<typeof mongoose> | null = null

export async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return true
  if (!MONGODB_URI) return false
  
  if (!isConnecting) {
    isConnecting = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      socketTimeoutMS: 4000,
      family: 4
    })
  }
  try {
    await isConnecting
    return (mongoose.connection.readyState as number) === 1
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err)
    isConnecting = null
    return false
  }
}

function isDbConnected(): boolean {
  return (mongoose.connection.readyState as number) === 1
}

function readJsonFile(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) {
      return []
    }
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data || '[]')
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err)
    return []
  }
}

function writeJsonFile(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err)
  }
}

function freshifyDates(entries: any[]): any[] {
  if (entries.length === 0) return entries
  const sorted = [...entries].sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime())
  const baseDate = new Date()
  return sorted.map((entry, index) => {
    // Spread them across the last 12 days relative to the current date to fit the dashboard's 14-day chart
    const daysAgo = Math.max(0, (sorted.length - 1 - index) * 3 + 1)
    const entryDate = new Date(baseDate.getTime() - daysAgo * 86400000)
    const dateStr = entryDate.toISOString().split('T')[0]
    return {
      ...entry,
      date: dateStr,
      createdAt: entryDate.toISOString(),
      updatedAt: entryDate.toISOString()
    }
  })
}

// ─── EXPENSE MODEL ───────────────────────────────────────────────────
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

const ExpenseSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  currency: { type: String, default: 'INR' },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: String, required: true },
  vendor: { type: String, default: 'Direct Cash Purchases' },
  paymentMethod: { type: String, default: 'cash' },
}, { timestamps: true })

const ExpenseModel: Model<any> = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema)

// ─── INCOME MODEL ────────────────────────────────────────────────────
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

const IncomeSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  currency: { type: String, default: 'INR' },
  amount: { type: Number, required: true },
  source: { type: String, required: true },
  description: { type: String, default: 'Counter Sales' },
  date: { type: String, required: true },
  customer: { type: String, default: 'Walk-in' },
  paymentMethod: { type: String, default: 'upi' },
}, { timestamps: true })

const IncomeModel: Model<any> = mongoose.models.Income || mongoose.model('Income', IncomeSchema)

// ─── RECEIPT MODEL ───────────────────────────────────────────────────
export interface Receipt {
  id: string
  userId: string
  imageUrl: string
  status: string
  createdAt: string
  _localPath?: string
  _mimeType?: string
  extractedData?: {
    vendor: string
    date: string
    items: any[]
    taxAmount: number
    totalAmount: number
    amount: number
  }
  linkedExpenseId?: string
  errorDetails?: string
}

const ReceiptSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  imageUrl: { type: String, required: true },
  status: { type: String, default: 'processing' },
  _localPath: { type: String },
  _mimeType: { type: String },
  extractedData: {
    vendor: { type: String },
    date: { type: String },
    items: { type: Array, default: [] },
    taxAmount: { type: Number },
    totalAmount: { type: Number },
    amount: { type: Number }
  },
  linkedExpenseId: { type: String },
  errorDetails: { type: String }
}, { timestamps: true })

const ReceiptModel: Model<any> = mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema)

// ─── WEBSITE CONFIG MODEL ────────────────────────────────────────────
const WebsiteSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  businessName: { type: String },
  tagline: { type: String },
  design: {
    primaryColor: { type: String },
    secondaryColor: { type: String },
    bgGradient: { type: String },
    fontFamily: { type: String }
  },
  hero: {
    title: { type: String },
    subtitle: { type: String }
  },
  about: { type: String },
  contact: {
    phone: { type: String },
    address: { type: String }
  },
  products: { type: Array, default: [] }
}, { timestamps: true })

const WebsiteModel: Model<any> = mongoose.models.Website || mongoose.model('Website', WebsiteSchema)

// ─── DATA HANDLERS WITH OFFLINE FALLBACK ─────────────────────────────

export const loadExpenses = async (userId: string = 'demo-user'): Promise<Expense[]> => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Loading expenses locally for user: ${userId}`)
      let docs = readJsonFile(EXPENSES_FILE).filter((e: any) => e.userId === userId)
      return freshifyDates(docs).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    let docs = await ExpenseModel.find({ userId }).sort({ date: -1 }).lean()
    return docs as unknown as Expense[]
  } catch (err) {
    console.error('Error loading expenses:', err)
    return []
  }
}

export const saveExpenses = async (data: Expense[], userId: string = 'demo-user') => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Saving expenses locally for user: ${userId}`)
      const userExpenses = data.map(e => ({ ...e, userId }))
      const allExpenses = readJsonFile(EXPENSES_FILE).filter(e => e.userId !== userId)
      const updated = [...allExpenses, ...userExpenses]
      writeJsonFile(EXPENSES_FILE, updated)
      return
    }

    const userExpenses = data.map(e => ({ ...e, userId }))
    
    // Perform bulk upserts for incoming data
    const ops = userExpenses.map(exp => ({
      updateOne: {
        filter: { id: exp.id, userId },
        update: { ...exp, userId },
        upsert: true
      }
    }))
    
    if (ops.length > 0) {
      await ExpenseModel.bulkWrite(ops)
    }

    // Clean up deleted items
    const currentIds = userExpenses.map(e => e.id)
    await ExpenseModel.deleteMany({ userId, id: { $nin: currentIds } })
  } catch (err) {
    console.error('Error saving expenses:', err)
  }
}

export const loadIncome = async (userId: string = 'demo-user'): Promise<Income[]> => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Loading income locally for user: ${userId}`)
      let docs = readJsonFile(INCOME_FILE).filter((i: any) => i.userId === userId)
      return freshifyDates(docs).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    let docs = await IncomeModel.find({ userId }).sort({ date: -1 }).lean()
    return docs as unknown as Income[]
  } catch (err) {
    console.error('Error loading income:', err)
    return []
  }
}

export const saveIncome = async (data: Income[], userId: string = 'demo-user') => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Saving income locally for user: ${userId}`)
      const userIncome = data.map(i => ({ ...i, userId }))
      const allIncome = readJsonFile(INCOME_FILE).filter(i => i.userId !== userId)
      const updated = [...allIncome, ...userIncome]
      writeJsonFile(INCOME_FILE, updated)
      return
    }

    const userIncome = data.map(i => ({ ...i, userId }))
    const ops = userIncome.map(inc => ({
      updateOne: {
        filter: { id: inc.id, userId },
        update: { ...inc, userId },
        upsert: true
      }
    }))
    
    if (ops.length > 0) {
      await IncomeModel.bulkWrite(ops)
    }

    const currentIds = userIncome.map(i => i.id)
    await IncomeModel.deleteMany({ userId, id: { $nin: currentIds } })
  } catch (err) {
    console.error('Error saving income:', err)
  }
}

export const loadReceipts = async (userId: string = 'demo-user'): Promise<Receipt[]> => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Loading receipts locally for user: ${userId}`)
      let docs = readJsonFile(RECEIPTS_FILE).filter((r: any) => r.userId === userId)
      return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    let docs = await ReceiptModel.find({ userId }).sort({ createdAt: -1 }).lean()
    return docs as unknown as Receipt[]
  } catch (err) {
    console.error('Error loading receipts:', err)
    return []
  }
}

export const saveReceipts = async (data: Receipt[], userId: string = 'demo-user') => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Saving receipts locally for user: ${userId}`)
      const userReceipts = data.map(r => ({ ...r, userId }))
      const allReceipts = readJsonFile(RECEIPTS_FILE).filter(r => r.userId !== userId)
      const updated = [...allReceipts, ...userReceipts]
      writeJsonFile(RECEIPTS_FILE, updated)
      return
    }

    const userReceipts = data.map(r => ({ ...r, userId }))
    const ops = userReceipts.map(rec => ({
      updateOne: {
        filter: { id: rec.id, userId },
        update: { ...rec, userId },
        upsert: true
      }
    }))
    
    if (ops.length > 0) {
      await ReceiptModel.bulkWrite(ops)
    }

    const currentIds = userReceipts.map(r => r.id)
    await ReceiptModel.deleteMany({ userId, id: { $nin: currentIds } })
  } catch (err) {
    console.error('Error saving receipts:', err)
  }
}

export const loadWebsiteConfig = async (userId: string = 'demo-user'): Promise<any> => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Loading website config locally for user: ${userId}`)
      const docs = readJsonFile(WEBSITE_FILE)
      let doc = docs.find((d: any) => d.userId === userId)
      return doc || null
    }

    let doc = await WebsiteModel.findOne({ userId }).lean()
    return doc || null
  } catch (err) {
    console.error('Error loading website config:', err)
    return null
  }
}

export const saveWebsiteConfig = async (config: any, userId: string = 'demo-user') => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Saving website config locally for user: ${userId}`)
      const docs = readJsonFile(WEBSITE_FILE)
      const otherDocs = docs.filter((d: any) => d.userId !== userId)
      const updated = [...otherDocs, { ...config, userId }]
      writeJsonFile(WEBSITE_FILE, updated)
      return
    }

    await WebsiteModel.updateOne(
      { userId },
      { $set: { ...config, userId } },
      { upsert: true }
    )
  } catch (err) {
    console.error('Error saving website config:', err)
  }
}

export const seedSampleData = async (userId: string): Promise<boolean> => {
  try {
    await ensureDbConnected()
    if (!isDbConnected()) {
      console.log(`[Offline Fallback] Seeding sample data locally for user: ${userId}`)
      
      // Seed Expenses
      const demoExpenses = readJsonFile(EXPENSES_FILE).filter((e: any) => e.userId === 'demo-user' || e.userId === 'demo')
      if (demoExpenses.length > 0) {
        const newExpenses = demoExpenses.map((d: any) => ({
          ...d,
          id: `${d.id}_${userId.slice(0, 4)}`,
          userId
        }))
        const allExpenses = [...readJsonFile(EXPENSES_FILE).filter((e: any) => e.userId !== userId), ...newExpenses]
        writeJsonFile(EXPENSES_FILE, allExpenses)
      }

      // Seed Income
      const demoIncome = readJsonFile(INCOME_FILE).filter((i: any) => i.userId === 'demo-user' || i.userId === 'demo')
      if (demoIncome.length > 0) {
        const newIncome = demoIncome.map((d: any) => ({
          ...d,
          id: `${d.id}_${userId.slice(0, 4)}`,
          userId
        }))
        const allIncome = [...readJsonFile(INCOME_FILE).filter((i: any) => i.userId !== userId), ...newIncome]
        writeJsonFile(INCOME_FILE, allIncome)
      }

      // Seed Receipts
      const demoReceipts = readJsonFile(RECEIPTS_FILE).filter((r: any) => r.userId === 'demo-user' || r.userId === 'demo')
      if (demoReceipts.length > 0) {
        const newReceipts = demoReceipts.map((d: any) => ({
          ...d,
          id: `${d.id}_${userId.slice(0, 4)}`,
          userId
        }))
        const allReceipts = [...readJsonFile(RECEIPTS_FILE).filter((r: any) => r.userId !== userId), ...newReceipts]
        writeJsonFile(RECEIPTS_FILE, allReceipts)
      }

      // Seed Website Config
      const websiteDocs = readJsonFile(WEBSITE_FILE)
      const demoWebsite = websiteDocs.find((d: any) => d.userId === 'demo-user' || d.userId === 'demo')
      if (demoWebsite) {
        const newWebsite = { ...demoWebsite, userId }
        const allWebsites = [...websiteDocs.filter((d: any) => d.userId !== userId), newWebsite]
        writeJsonFile(WEBSITE_FILE, allWebsites)
      }
      return true
    }

    // Online Seeding (MongoDB)
    console.log(`[Auto-Seed] Seeding sample data via Mongoose for user: ${userId}`)
    
    // Seed Expenses
    const demoExpenses = await ExpenseModel.find({ userId: 'demo-user' }).lean()
    if (demoExpenses.length > 0) {
      await ExpenseModel.deleteMany({ userId })
      const newExpenses = demoExpenses.map((d: any) => {
        const { _id, ...cleanDoc } = d
        return { ...cleanDoc, id: `${d.id}_${userId.slice(0, 4)}`, userId }
      })
      await ExpenseModel.insertMany(newExpenses)
    }

    // Seed Income
    const demoIncome = await IncomeModel.find({ userId: 'demo-user' }).lean()
    if (demoIncome.length > 0) {
      await IncomeModel.deleteMany({ userId })
      const newIncome = demoIncome.map((d: any) => {
        const { _id, ...cleanDoc } = d
        return { ...cleanDoc, id: `${d.id}_${userId.slice(0, 4)}`, userId }
      })
      await IncomeModel.insertMany(newIncome)
    }

    // Seed Receipts
    const demoReceipts = await ReceiptModel.find({ userId: 'demo-user' }).lean()
    if (demoReceipts.length > 0) {
      await ReceiptModel.deleteMany({ userId })
      const newReceipts = demoReceipts.map((d: any) => {
        const { _id, ...cleanDoc } = d
        return { ...cleanDoc, id: `${d.id}_${userId.slice(0, 4)}`, userId }
      })
      await ReceiptModel.insertMany(newReceipts)
    }

    // Seed Website Config
    const demoWebsite = await WebsiteModel.findOne({ userId: 'demo-user' }).lean()
    if (demoWebsite) {
      await WebsiteModel.deleteOne({ userId })
      const { _id, ...cleanDoc } = demoWebsite as any
      await WebsiteModel.create({ ...cleanDoc, userId })
    }

    return true
  } catch (err) {
    console.error('Error seeding sample data:', err)
    return false
  }
}
