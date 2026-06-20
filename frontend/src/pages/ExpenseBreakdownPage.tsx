import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PieChart, TrendingDown, Layers, Filter } from 'lucide-react'
import { expenseApi } from '@/services/api'
import type { Expense, ExpenseCategory } from '@/types'
import { clsx } from 'clsx'

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  inventory: 'bg-blue-500 text-white', rent: 'bg-purple-500 text-white',
  electricity: 'bg-amber-500 text-white', salary: 'bg-green-500 text-white',
  marketing: 'bg-pink-500 text-white', transport: 'bg-cyan-500 text-white',
  maintenance: 'bg-orange-500 text-white', tax: 'bg-red-500 text-white',
  loan_emi: 'bg-indigo-500 text-white', other: 'bg-gray-500 text-white',
}

export default function ExpenseBreakdownPage() {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all')

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expenseApi.list().then((r) => r.data.data),
  })

  // Calculations
  const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
  
  const categoryTotals = expenses.reduce((acc: Record<string, number>, e: Expense) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  const sortedCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => {
      const amt = amount as number
      return {
        category: category as ExpenseCategory,
        amount: amt,
        percentage: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0,
      }
    })
    .sort((a, b) => (b.amount as number) - (a.amount as number))

  const filteredExpenses = selectedCategory === 'all' 
    ? expenses 
    : expenses.filter((e: Expense) => e.category === selectedCategory)

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Expense Breakdown</h1>
        <p className="text-sm text-gray-500">Analyze where your operational funds are being allocated</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400">Total Outflows</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">₹{totalExpenses.toLocaleString('en-IN')}</h3>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600"><TrendingDown size={20} /></div>
        </div>

        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400">Primary Category</span>
            <h3 className="text-base font-bold text-slate-800 mt-1 capitalize">
              {sortedCategories[0]?.category.replace('_', ' ') || 'None'}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Layers size={20} /></div>
        </div>

        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400">Active Cost Categories</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">{sortedCategories.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><PieChart size={20} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Share Distribution List */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800">Category Share</h3>
          <div className="space-y-3">
            {sortedCategories.map(({ category, amount, percentage }) => (
              <button 
                key={category}
                onClick={() => setSelectedCategory(category === selectedCategory ? 'all' : category)}
                className={clsx(
                  "w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1.5",
                  selectedCategory === category ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-gray-50"
                )}
              >
                <div className="flex justify-between items-center w-full text-xs">
                  <div className="flex items-center gap-2">
                    <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0", CATEGORY_COLORS[category].split(' ')[0])} />
                    <span className="font-bold text-slate-700 capitalize">{category.replace('_', ' ')}</span>
                  </div>
                  <span className="font-black text-slate-800">₹{amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className={clsx("h-full rounded-full", CATEGORY_COLORS[category].split(' ')[0])} style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-[10px] text-gray-400 font-bold">{percentage}% of all distribution</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Context Ledger List */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Filtered Cost Ledger</h3>
            </div>
            {selectedCategory !== 'all' && (
              <button onClick={() => setSelectedCategory('all')} className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded-md font-bold">
                Reset Filter
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 max-h-[460px]">
            {filteredExpenses.map((e: Expense) => (
              <div key={e.id} className="p-4 flex justify-between items-center hover:bg-slate-50/40 transition">
                <div>
                  <p className="text-xs font-bold text-slate-700">{e.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={clsx("text-[9px] px-1.5 py-0.2 rounded-sm font-bold uppercase tracking-tight", CATEGORY_COLORS[e.category])}>
                      {e.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">{e.vendor}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-800">₹{e.amount.toLocaleString('en-IN')}</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
            {filteredExpenses.length === 0 && (
              <p className="text-center py-12 text-xs text-gray-400 font-medium">No ledger records matched this filtering criteria.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}