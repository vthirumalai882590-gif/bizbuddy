// ── User & Auth ──────────────────────────────────────────────
export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  businessName?: string
  businessType?: string
  city?: string
  language: 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'gu'
  phone?: string
  createdAt: Date
  plan: 'free' | 'pro' | 'enterprise'
}

// ── Expense ───────────────────────────────────────────────────
export type ExpenseCategory =
  | 'inventory'
  | 'rent'
  | 'electricity'
  | 'salary'
  | 'marketing'
  | 'transport'
  | 'maintenance'
  | 'tax'
  | 'loan_emi'
  | 'other'

export interface Expense {
  id: string
  userId: string
  amount: number
  currency: 'INR'
  category: ExpenseCategory
  description: string
  date: Date
  receiptUrl?: string
  vendor?: string
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit'
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

// ── Income ────────────────────────────────────────────────────
export type IncomeSource =
  | 'sales'
  | 'service'
  | 'rent'
  | 'commission'
  | 'online'
  | 'other'

export interface Income {
  id: string
  userId: string
  amount: number
  currency: 'INR'
  source: IncomeSource
  description: string
  date: Date
  customer?: string
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer'
  invoiceUrl?: string
  createdAt: Date
  updatedAt: Date
}

// ── Receipt ───────────────────────────────────────────────────
export interface Receipt {
  id: string
  userId: string
  imageUrl: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extractedData?: {
    vendor: string
    amount: number
    date: string
    items: ReceiptItem[]
    taxAmount?: number
    totalAmount: number
  }
  linkedExpenseId?: string
  createdAt: Date
}

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

// ── Financial Report ──────────────────────────────────────────
export interface FinancialSummary {
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate: Date
  endDate: Date
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  topExpenseCategories: { category: ExpenseCategory; amount: number }[]
  topIncomeSources: { source: IncomeSource; amount: number }[]
  cashFlow: CashFlowPoint[]
}

export interface CashFlowPoint {
  date: string
  income: number
  expense: number
  net: number
}

// ── Loan Report ───────────────────────────────────────────────
export interface LoanReadinessReport {
  id: string
  userId: string
  generatedAt: Date
  score: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  monthlyRevenue: number
  monthlyExpenses: number
  netMonthlyIncome: number
  businessAge: number // months
  creditUtilization: number
  debtServiceRatio: number
  recommendations: string[]
  eligibleLoanAmount: number
  eligibleSchemes: LoanScheme[]
  pdfUrl?: string
}

export interface LoanScheme {
  name: string
  provider: string
  maxAmount: number
  interestRate: string
  tenure: string
  eligibility: string
  url: string
}

// ── Marketing ─────────────────────────────────────────────────
export type Platform = 'instagram' | 'facebook' | 'twitter' | 'whatsapp'

export interface MarketingPost {
  id: string
  userId: string
  platform: Platform
  content: string
  imageUrl?: string
  hashtags: string[]
  scheduledAt?: Date
  publishedAt?: Date
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  festival?: string
  engagementHints: string[]
  createdAt: Date
}

// ── AI Chat ───────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  functionCall?: {
    name: string
    args: Record<string, unknown>
    result: unknown
  }
}

// ── Website Generator ─────────────────────────────────────────
export interface BusinessWebsite {
  id: string
  userId: string
  businessName: string
  tagline: string
  description: string
  theme: 'modern' | 'traditional' | 'minimal' | 'vibrant'
  primaryColor: string
  products: WebsiteProduct[]
  contactInfo: {
    phone: string
    email?: string
    address: string
    googleMapsUrl?: string
  }
  socialLinks: {
    facebook?: string
    instagram?: string
    whatsapp?: string
  }
  publishedUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface WebsiteProduct {
  id?: string
  name: string
  description: string
  price: number
  imageUrl?: string
  stockCount?: number
}

export interface StorefrontContext {
  businessName: string
  tagline: string
  about: string
  phone: string
  address: string
  products: WebsiteProduct[]
}

// ── Notification ──────────────────────────────────────────────
export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
  actionUrl?: string
}

// ── API Response types ────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}