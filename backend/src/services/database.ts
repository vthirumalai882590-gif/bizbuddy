import mongoose, { Schema, Model } from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

// Initialize Connection
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected successfully to MongoDB Atlas'))
    .catch((err) => console.error('❌ MongoDB connection error:', err))
} else {
  console.warn('⚠️ MONGODB_URI is not defined in .env. Falling back to default settings.')
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

// ─── MONGODB DATA HANDLERS ───────────────────────────────────────────

export const loadExpenses = async (userId: string = 'demo-user'): Promise<Expense[]> => {
  try {
    let docs = await ExpenseModel.find({ userId }).sort({ date: -1 }).lean()
    
    // Auto-seed: If the user is a new logged-in user with no data, copy the synthetic demo data
    if (docs.length === 0 && userId !== 'demo-user' && userId !== 'demo') {
      console.log(`[Auto-Seed] Auto-seeding expenses for user: ${userId}`)
      const demoDocs = await ExpenseModel.find({ userId: 'demo-user' }).lean()
      if (demoDocs.length > 0) {
        const newDocs = demoDocs.map((d: any) => {
          const { _id, ...cleanDoc } = d
          return {
            ...cleanDoc,
            id: `${d.id}_${userId.slice(0, 4)}`,
            userId
          }
        })
        await ExpenseModel.insertMany(newDocs)
        docs = newDocs
      }
    }
    
    return docs as unknown as Expense[]
  } catch (err) {
    console.error('Error loading expenses from MongoDB:', err)
    return []
  }
}

export const saveExpenses = async (data: Expense[], userId: string = 'demo-user') => {
  try {
    const userExpenses = data.filter(e => e.userId === userId || e.userId === 'demo')
    
    // Perform bulk upserts for incoming data
    const ops = userExpenses.map(exp => ({
      updateOne: {
        filter: { id: exp.id },
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
    console.error('Error saving expenses to MongoDB:', err)
  }
}

export const loadIncome = async (userId: string = 'demo-user'): Promise<Income[]> => {
  try {
    let docs = await IncomeModel.find({ userId }).sort({ date: -1 }).lean()
    
    if (docs.length === 0 && userId !== 'demo-user' && userId !== 'demo') {
      console.log(`[Auto-Seed] Auto-seeding income for user: ${userId}`)
      const demoDocs = await IncomeModel.find({ userId: 'demo-user' }).lean()
      if (demoDocs.length > 0) {
        const newDocs = demoDocs.map((d: any) => {
          const { _id, ...cleanDoc } = d
          return {
            ...cleanDoc,
            id: `${d.id}_${userId.slice(0, 4)}`,
            userId
          }
        })
        await IncomeModel.insertMany(newDocs)
        docs = newDocs
      }
    }
    
    return docs as unknown as Income[]
  } catch (err) {
    console.error('Error loading income from MongoDB:', err)
    return []
  }
}

export const saveIncome = async (data: Income[], userId: string = 'demo-user') => {
  try {
    const userIncome = data.filter(i => i.userId === userId || i.userId === 'demo')
    const ops = userIncome.map(inc => ({
      updateOne: {
        filter: { id: inc.id },
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
    console.error('Error saving income to MongoDB:', err)
  }
}

export const loadReceipts = async (userId: string = 'demo-user'): Promise<Receipt[]> => {
  try {
    let docs = await ReceiptModel.find({ userId }).sort({ createdAt: -1 }).lean()
    
    if (docs.length === 0 && userId !== 'demo-user' && userId !== 'demo') {
      console.log(`[Auto-Seed] Auto-seeding receipts for user: ${userId}`)
      const demoDocs = await ReceiptModel.find({ userId: 'demo-user' }).lean()
      if (demoDocs.length > 0) {
        const newDocs = demoDocs.map((d: any) => {
          const { _id, ...cleanDoc } = d
          return {
            ...cleanDoc,
            id: `${d.id}_${userId.slice(0, 4)}`,
            userId
          }
        })
        await ReceiptModel.insertMany(newDocs)
        docs = newDocs
      }
    }
    
    return docs as unknown as Receipt[]
  } catch (err) {
    console.error('Error loading receipts from MongoDB:', err)
    return []
  }
}

export const saveReceipts = async (data: Receipt[], userId: string = 'demo-user') => {
  try {
    const userReceipts = data.filter(r => r.userId === userId || r.userId === 'demo')
    const ops = userReceipts.map(rec => ({
      updateOne: {
        filter: { id: rec.id },
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
    console.error('Error saving receipts to MongoDB:', err)
  }
}

export const loadWebsiteConfig = async (userId: string = 'demo-user'): Promise<any> => {
  try {
    let doc = await WebsiteModel.findOne({ userId }).lean()
    
    if (!doc && userId !== 'demo-user' && userId !== 'demo') {
      console.log(`[Auto-Seed] Auto-seeding website configuration for user: ${userId}`)
      const demoDoc = await WebsiteModel.findOne({ userId: 'demo-user' }).lean()
      if (demoDoc) {
        const { _id, ...cleanDoc } = demoDoc
        const newDoc = {
          ...cleanDoc,
          userId
        }
        await WebsiteModel.create(newDoc)
        doc = newDoc
      }
    }
    
    return doc
  } catch (err) {
    console.error('Error loading website config from MongoDB:', err)
    return null
  }
}

export const saveWebsiteConfig = async (config: any, userId: string = 'demo-user') => {
  try {
    await WebsiteModel.updateOne(
      { userId },
      { $set: { ...config, userId } },
      { upsert: true }
    )
  } catch (err) {
    console.error('Error saving website config to MongoDB:', err)
  }
}
