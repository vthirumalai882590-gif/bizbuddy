import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { saveExpenses, saveIncome, saveReceipts, saveWebsiteConfig } from './database'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not configured in your .env file.')
  process.exit(1)
}

const seedDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected successfully.')

    const userId = 'demo-user'

    console.log('🧹 Clearing existing collections for user demo-user...')
    // We can directly call the save functions with empty lists to clean up, 
    // or just let Mongoose models do it
    await mongoose.connection.db?.collection('expenses').deleteMany({ userId })
    await mongoose.connection.db?.collection('income').deleteMany({ userId })
    await mongoose.connection.db?.collection('receipts').deleteMany({ userId })
    await mongoose.connection.db?.collection('websites').deleteMany({ userId })
    console.log('✅ Collections cleared.')

    // ─── SYNTHETIC INCOME DATA ──────────────────────────────────────────
    console.log('🌱 Generating synthetic income data...')
    const baseDate = new Date()
    const syntheticIncome = [
      {
        id: 'inc_1',
        userId,
        currency: 'INR',
        amount: 14500,
        source: 'Counter Sales',
        description: 'Kirana daily cash collections',
        date: new Date(baseDate.getTime() - 1 * 86400000).toISOString().split('T')[0], // 1 day ago
        customer: 'Walk-in Customers',
        paymentMethod: 'cash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inc_2',
        userId,
        currency: 'INR',
        amount: 8200,
        source: 'UPI QR Code',
        description: 'GPay/PhonePe retail scan settlements',
        date: new Date(baseDate.getTime() - 2 * 86400000).toISOString().split('T')[0], // 2 days ago
        customer: 'Retail Customers',
        paymentMethod: 'upi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inc_3',
        userId,
        currency: 'INR',
        amount: 25000,
        source: 'Bulk Delivery',
        description: 'Wholesale order supply to local hotel',
        date: new Date(baseDate.getTime() - 4 * 86400000).toISOString().split('T')[0],
        customer: 'Taj Residency Cafe',
        paymentMethod: 'bank_transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inc_4',
        userId,
        currency: 'INR',
        amount: 5400,
        source: 'Home Delivery',
        description: 'Grocery items delivery orders',
        date: new Date(baseDate.getTime() - 5 * 86400000).toISOString().split('T')[0],
        customer: 'Society Residents',
        paymentMethod: 'upi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inc_5',
        userId,
        currency: 'INR',
        amount: 12200,
        source: 'Counter Sales',
        description: 'Kirana retail collections',
        date: new Date(baseDate.getTime() - 7 * 86400000).toISOString().split('T')[0],
        customer: 'Walk-in Customers',
        paymentMethod: 'cash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inc_6',
        userId,
        currency: 'INR',
        amount: 6800,
        source: 'UPI QR Code',
        description: 'Evening counter retail scans',
        date: new Date(baseDate.getTime() - 9 * 86400000).toISOString().split('T')[0],
        customer: 'Retail Customers',
        paymentMethod: 'upi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inc_7',
        userId,
        currency: 'INR',
        amount: 18000,
        source: 'Bulk Delivery',
        description: 'Festival season gift hamper order',
        date: new Date(baseDate.getTime() - 11 * 86400000).toISOString().split('T')[0],
        customer: 'Sharma Corp Ltd',
        paymentMethod: 'card',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inc_8',
        userId,
        currency: 'INR',
        amount: 15600,
        source: 'Counter Sales',
        description: 'Weekly dry fruit stock sales',
        date: new Date(baseDate.getTime() - 14 * 86400000).toISOString().split('T')[0],
        customer: 'Walk-in Customers',
        paymentMethod: 'cash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    await saveIncome(syntheticIncome, userId)

    // ─── SYNTHETIC EXPENSE DATA ──────────────────────────────────────────
    console.log('🌱 Generating synthetic expense data...')
    const syntheticExpenses = [
      {
        id: 'exp_1',
        userId,
        currency: 'INR',
        amount: 12000,
        category: 'inventory',
        description: 'Restock edible oils, flour, and spices from distributor',
        date: new Date(baseDate.getTime() - 2 * 86400000).toISOString().split('T')[0],
        vendor: 'Riddhi Siddhi Traders',
        paymentMethod: 'bank_transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'exp_2',
        userId,
        currency: 'INR',
        amount: 15000,
        category: 'rent',
        description: 'Shop rent payment for June-July cycle',
        date: new Date(baseDate.getTime() - 6 * 86400000).toISOString().split('T')[0],
        vendor: 'Premji Properties landlord',
        paymentMethod: 'bank_transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'exp_3',
        userId,
        currency: 'INR',
        amount: 3200,
        category: 'electricity',
        description: 'Commercial electricity meter bill payment',
        date: new Date(baseDate.getTime() - 3 * 86400000).toISOString().split('T')[0],
        vendor: 'State Power Corporation Ltd',
        paymentMethod: 'upi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'exp_4',
        userId,
        currency: 'INR',
        amount: 8000,
        category: 'salary',
        description: 'Monthly wages for store helper boy',
        date: new Date(baseDate.getTime() - 7 * 86400000).toISOString().split('T')[0],
        vendor: 'Rohan Kumar (Helper)',
        paymentMethod: 'cash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'exp_5',
        userId,
        currency: 'INR',
        amount: 4500,
        category: 'loan_emi',
        description: 'Pradhan Mantri MUDRA Yojana loan EMI payment',
        date: new Date(baseDate.getTime() - 10 * 86400000).toISOString().split('T')[0],
        vendor: 'State Bank of India',
        paymentMethod: 'bank_transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'exp_6',
        userId,
        currency: 'INR',
        amount: 2500,
        category: 'transport',
        description: 'Auto cargo shipping charges for bulk items cargo',
        date: new Date(baseDate.getTime() - 5 * 86400000).toISOString().split('T')[0],
        vendor: 'Local Logistics Tempo',
        paymentMethod: 'cash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'exp_7',
        userId,
        currency: 'INR',
        amount: 6000,
        category: 'inventory',
        description: 'Rice bags and wheat flour stock buy',
        date: new Date(baseDate.getTime() - 12 * 86400000).toISOString().split('T')[0],
        vendor: 'APMC Grain Market',
        paymentMethod: 'upi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'exp_8',
        userId,
        currency: 'INR',
        amount: 1500,
        category: 'marketing',
        description: 'Diwali special discount pamphlets distribution print cost',
        date: new Date(baseDate.getTime() - 8 * 86400000).toISOString().split('T')[0],
        vendor: 'National Print Press',
        paymentMethod: 'upi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    await saveExpenses(syntheticExpenses, userId)

    // ─── SYNTHETIC RECEIPTS DATA ─────────────────────────────────────────
    console.log('🌱 Generating synthetic receipts data...')
    const syntheticReceipts = [
      {
        id: 'rec_1',
        userId,
        imageUrl: 'http://localhost:5001/uploads/demo_receipt_1.jpg',
        status: 'completed',
        createdAt: new Date(baseDate.getTime() - 2 * 86400000).toISOString(),
        extractedData: {
          vendor: 'Riddhi Siddhi Traders',
          date: new Date(baseDate.getTime() - 2 * 86400000).toISOString().split('T')[0],
          items: [
            { name: 'Edible Fortune Oil 15L', quantity: 1, unitPrice: 1800, totalPrice: 1800 },
            { name: 'Basmati Rice 25kg', quantity: 2, unitPrice: 2100, totalPrice: 4200 },
            { name: 'Wheat Flour Ashirvaad 10kg', quantity: 12, unitPrice: 500, totalPrice: 6000 }
          ],
          taxAmount: 0,
          totalAmount: 12000,
          amount: 12000
        }
      },
      {
        id: 'rec_2',
        userId,
        imageUrl: 'http://localhost:5001/uploads/demo_receipt_2.jpg',
        status: 'completed',
        createdAt: new Date(baseDate.getTime() - 3 * 86400000).toISOString(),
        extractedData: {
          vendor: 'State Power Corporation Ltd',
          date: new Date(baseDate.getTime() - 3 * 86400000).toISOString().split('T')[0],
          items: [
            { name: 'Commercial Electricity Charges', quantity: 1, unitPrice: 3200, totalPrice: 3200 }
          ],
          taxAmount: 0,
          totalAmount: 3200,
          amount: 3200
        }
      }
    ]
    await saveReceipts(syntheticReceipts, userId)

    // ─── SYNTHETIC WEBSITE SCROLL CONFIG ────────────────────────────────
    console.log('🌱 Generating synthetic website configuration...')
    const syntheticWebsite = {
      userId,
      businessName: 'Sharma General Store',
      tagline: 'Quality Grocery & Daily Needs at Wholesale Rates',
      design: {
        primaryColor: '#16a34a', // Emerald green
        secondaryColor: '#f97316', // Orange accent
        bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', // Pale green gradient
        fontFamily: 'sans-serif'
      },
      hero: {
        title: 'Your Trusted Local Neighborhood Grocery Store',
        subtitle: 'Get fresh grains, quality spices, dry fruits, and daily kitchen essentials at unmatchable wholesale prices.'
      },
      about: 'Established in 2012 in the heart of Chennai, Sharma General Store has been serving local families with genuine, pure grains and daily grocery necessities. We believe in providing the best quality at retail prices with convenient UPI and free home delivery systems.',
      contact: {
        phone: '+91 98765 43210',
        address: 'No. 42, G.N. Chetty Road, T. Nagar, Chennai, Tamil Nadu - 600017'
      },
      products: [
        { name: 'Premium Basmati Rice (1kg)', price: '₹120', category: 'grains' },
        { name: 'Fortune Mustard Oil (1L)', price: '₹175', category: 'oils' },
        { name: 'Ashirvaad Shudh Chakki Atta (5kg)', price: '₹260', category: 'flour' },
        { name: 'Organic Turmeric Powder (250g)', price: '₹85', category: 'spices' }
      ]
    }
    await saveWebsiteConfig(syntheticWebsite, userId)

    console.log('✨ Database seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to seed database:', error)
    process.exit(1)
  }
}

seedDatabase()
