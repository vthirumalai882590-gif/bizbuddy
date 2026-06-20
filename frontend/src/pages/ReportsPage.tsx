import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { FileText, Download, TrendingUp, Layers, Wallet } from 'lucide-react'
import { incomeApi, expenseApi } from '@/services/api'
import { clsx } from 'clsx'
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, isAfter, parseISO } from 'date-fns'

interface ExtendedFinancialSummary {
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  totalInvestments: number
  totalStockValue: number
  topExpenseCategories: Array<{ category: string; amount: number }>
  topIncomeSources: Array<{ source: string; amount: number }>
  cashFlow: Array<{ date: string; income: number; expense: number; investments: number; stockValue: number }>
}

const PERIODS: { id: ExtendedFinancialSummary['period']; label: string }[] = [
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'quarterly', label: 'This Quarter' },
  { id: 'yearly', label: 'This Year' },
]

const PIE_COLORS = ['#16a34a', '#f97316', '#3b82f6', '#a855f7', '#dc2626', '#ca8a04']
const STORAGE_KEY = 'vendor_daily_sales_ledger'

export default function ReportsPage() {
  const [period, setPeriod] = useState<ExtendedFinancialSummary['period']>('yearly')

  // 1. Core Fetch Layers: Pulling direct operational data arrays
  const { data: sales = [] } = useQuery({
    queryKey: ['income'],
    queryFn: async () => {
      try {
        const res = await incomeApi.list()
        const rawData = res?.data?.data ?? res?.data
        if (Array.isArray(rawData) && rawData.length > 0) return rawData
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
      } catch {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
      }
    }
  })

  const { data: investments = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      try {
        const res = await expenseApi.list()
        const rawData = res?.data?.data ?? res?.data
        return Array.isArray(rawData) ? rawData : []
      } catch {
        return []
      }
    }
  })

  // --- LIVE COMPILATION ENGINE ---
  // Transforms raw sales records and stock asset investments into a structural metrics matrix
  const summary = useMemo<ExtendedFinancialSummary>(() => {
    const now = new Date()
    let filterStartDate: Date

    // Compute active date boundaries dynamically
    switch (period) {
      case 'weekly': filterStartDate = startOfWeek(now); break;
      case 'monthly': filterStartDate = startOfMonth(now); break;
      case 'quarterly': filterStartDate = startOfQuarter(now); break;
      case 'yearly': default: filterStartDate = startOfYear(now); break;
    }

    // Filter down array records matching timeframe context
    const activeSales = sales.filter((s: any) => s.date && isAfter(parseISO(s.date), filterStartDate))
    const activeExpenses = investments.filter((e: any) => e.date && isAfter(parseISO(e.date), filterStartDate))

    // Computations
    const totalIncome = activeSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)
    const totalExpenses = activeExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
    const netProfit = totalIncome - totalExpenses
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

    // Dynamic extraction of unique categories for Pie Charts
    const expenseMap: Record<string, number> = {}
    activeExpenses.forEach((e: any) => {
      const cat = e.category || 'unassigned'
      expenseMap[cat] = (expenseMap[cat] || 0) + (Number(e.amount) || 0)
    })
    const topExpenseCategories = Object.entries(expenseMap).map(([category, amount]) => ({ category, amount }))

    // Dynamic extraction of descriptions/sources for progress layouts
    const sourceMap: Record<string, number> = {}
    activeSales.forEach((s: any) => {
      const src = s.description || 'Counter Sales'
      sourceMap[src] = (sourceMap[src] || 0) + (Number(s.amount) || 0)
    })
    const topIncomeSources = Object.entries(sourceMap).map(([source, amount]) => ({ source, amount }))

    // Extract actual total stock value from localStorage stocks ledger
    let totalStockVal = 0
    try {
      const stored = localStorage.getItem('bizbuddy_stocks_ledger')
      if (stored) {
        const stocksList = JSON.parse(stored)
        if (Array.isArray(stocksList)) {
          totalStockVal = stocksList.reduce((sum: number, s: any) => sum + ((Number(s.quantity) || 0) * (Number(s.costPrice) || 0)), 0)
        }
      }
    } catch (e) {
      console.error(e)
    }

    // Generate balanced timeline chart nodes based on chosen timeline grouping structure
    let cashFlow: ExtendedFinancialSummary['cashFlow'] = []
    if (period === 'yearly') {
      const quarters = [
        { name: 'Q1', months: [0, 1, 2] },
        { name: 'Q2', months: [3, 4, 5] },
        { name: 'Q3', months: [6, 7, 8] },
        { name: 'Q4', months: [9, 10, 11] },
      ]
      cashFlow = quarters.map((q) => {
        const qSales = activeSales.filter((s: any) => {
          const d = parseISO(s.date)
          return q.months.includes(d.getMonth())
        })
        const qExpenses = activeExpenses.filter((e: any) => {
          const d = parseISO(e.date)
          return q.months.includes(d.getMonth())
        })
        const qIncome = qSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)
        const qExpense = qExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        return {
          date: q.name,
          income: qIncome,
          expense: qExpense,
          investments: qExpense,
          stockValue: totalStockVal,
        }
      })
    } else if (period === 'quarterly') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const currentMonth = now.getMonth()
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3
      const qMonths = [quarterStartMonth, quarterStartMonth + 1, quarterStartMonth + 2]
      cashFlow = qMonths.map((mIdx) => {
        const mSales = activeSales.filter((s: any) => {
          const d = parseISO(s.date)
          return d.getMonth() === mIdx
        })
        const mExpenses = activeExpenses.filter((e: any) => {
          const d = parseISO(e.date)
          return d.getMonth() === mIdx
        })
        const mIncome = mSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)
        const mExpense = mExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        return {
          date: monthNames[mIdx],
          income: mIncome,
          expense: mExpense,
          investments: mExpense,
          stockValue: totalStockVal,
        }
      })
    } else if (period === 'monthly') {
      const weeks = [
        { name: 'Week 1', start: 1, end: 7 },
        { name: 'Week 2', start: 8, end: 14 },
        { name: 'Week 3', start: 15, end: 21 },
        { name: 'Week 4', start: 22, end: 28 },
        { name: 'Week 5', start: 29, end: 31 },
      ]
      cashFlow = weeks.map((w) => {
        const wSales = activeSales.filter((s: any) => {
          const d = parseISO(s.date)
          const dom = d.getDate()
          return dom >= w.start && dom <= w.end
        })
        const wExpenses = activeExpenses.filter((e: any) => {
          const d = parseISO(e.date)
          const dom = d.getDate()
          return dom >= w.start && dom <= w.end
        })
        const wIncome = wSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)
        const wExpense = wExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        return {
          date: w.name,
          income: wIncome,
          expense: wExpense,
          investments: wExpense,
          stockValue: totalStockVal,
        }
      })
    } else {
      // weekly - last 7 days
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000)
        return d
      })
      cashFlow = days.map((d) => {
        const dateKey = d.toISOString().split('T')[0]
        const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' })
        const dSales = activeSales.filter((s: any) => s.date === dateKey)
        const dExpenses = activeExpenses.filter((e: any) => e.date === dateKey)
        const dIncome = dSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)
        const dExpense = dExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        return {
          date: dateStr,
          income: dIncome,
          expense: dExpense,
          investments: dExpense,
          stockValue: totalStockVal,
        }
      })
    }

    return {
      period,
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      totalInvestments: totalExpenses,
      totalStockValue: totalStockVal,
      topExpenseCategories: topExpenseCategories.length ? topExpenseCategories : [{ category: 'No Entries Registered', amount: 0 }],
      topIncomeSources: topIncomeSources.length ? topIncomeSources : [{ source: 'No Counter Sales Inflow', amount: 0 }],
      cashFlow
    }
  }, [sales, investments, period])

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Automated Performance Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time analytical metrics aggregated from investments and operational logs</p>
        </div>
        <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer">
          <Download size={15} /> Export Complete Audit
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={clsx(
              'px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer',
              period === p.id ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Internally Computed Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex justify-between items-start text-gray-500 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Net Profit Margin</span>
            <TrendingUp size={16} className={clsx(summary.netProfit >= 0 ? "text-green-600" : "text-red-600")} />
          </div>
          <span className={clsx("text-2xl font-bold block", summary.netProfit >= 0 ? "text-gray-900" : "text-red-700")}>
            ₹{summary.netProfit.toLocaleString('en-IN')}
          </span>
          <span className={clsx("text-xs font-medium", summary.netProfit >= 0 ? "text-green-600" : "text-red-500")}>
            {summary.profitMargin.toFixed(1)}% performance margin
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex justify-between items-start text-gray-500 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Total Revenue Stream</span>
          </div>
          <span className="text-2xl font-bold text-green-700 block">₹{summary.totalIncome.toLocaleString('en-IN')}</span>
          <span className="text-xs text-gray-400">Aggregated operating gains</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex justify-between items-start text-gray-500 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Asset Investments</span>
            <Wallet size={16} className="text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-blue-700 block">₹{summary.totalInvestments.toLocaleString('en-IN')}</span>
          <span className="text-xs text-gray-400">Capital allocation outlays</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex justify-between items-start text-gray-500 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Store Stock Valuation</span>
            <Layers size={16} className="text-orange-600" />
          </div>
          <span className="text-2xl font-bold text-orange-700 block">₹{summary.totalStockValue.toLocaleString('en-IN')}</span>
          <span className="text-xs text-gray-400">Live warehouse appraisal</span>
        </div>
      </div>

      {/* P&L Bar Chart Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Operations: Income vs Operational Expenses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.cashFlow}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `₹${(v || 0).toLocaleString('en-IN')}`} contentStyle={{ borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 12 }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar name="Operating Revenue" dataKey="income" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar name="Losses / Outflow" dataKey="expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Breakdown Pie Chart */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Top Cost Centers</h3>
          <div className="flex flex-col items-center justify-center h-full pb-4">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={summary.topExpenseCategories} dataKey="amount" nameKey="category" innerRadius={35} outerRadius={55} paddingAngle={3}>
                  {summary.topExpenseCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${(v || 0).toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-4 px-2 max-h-[120px] overflow-y-auto">
              {summary.topExpenseCategories.map((c, i) => (
                <div key={c.category} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 capitalize text-gray-600 truncate mr-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate">{c.category}</span>
                  </span>
                  <span className="font-medium text-gray-900 shrink-0">₹{(c.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Asset Inventory vs Capital Investments Trends Chart */}
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
        <h3 className="font-semibold text-gray-900 mb-1 text-sm">Asset Trends: Store Stock vs Portfolio Investments</h3>
        <p className="text-xs text-gray-400 mb-4">Tracking balance trends directly from inventory levels and investment modules.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={summary.cashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip formatter={(v: number) => `₹${(v || 0).toLocaleString('en-IN')}`} />
            <Legend verticalAlign="top" height={36} iconType="line" wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" name="Stock Asset Valuation" dataKey="stockValue" stroke="#ea580c" strokeWidth={2.5} activeDot={{ r: 6 }} />
            <Line type="monotone" name="Capital Investment Pool" dataKey="investments" stroke="#2563eb" strokeWidth={2.5} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue contribution stream progress meters */}
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">Revenue Stream Contribution Mix</h3>
        <div className="space-y-3">
          {summary.topIncomeSources.map((s) => {
            const currentAmount = s.amount || 0
            const pct = summary.totalIncome > 0 ? (currentAmount / summary.totalIncome) * 100 : 0
            return (
              <div key={s.source}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="capitalize text-gray-600 truncate mr-4">{s.source}</span>
                  <span className="font-semibold text-gray-900 shrink-0">₹{currentAmount.toLocaleString('en-IN')} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advisory status block */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <FileText size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Fully Automated Engine:</strong> This dashboard computes math matrix metrics live from active inventory, sales data, and asset investments.
        </p>
      </div>
    </div>
  )
}