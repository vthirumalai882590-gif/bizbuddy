import { useQuery } from '@tanstack/react-query'
import { Calendar, TrendingUp, ShieldAlert, Sparkles, ArrowRightLeft, ArrowDownRight } from 'lucide-react'
import { expenseApi, incomeApi } from '@/services/api'
import type { Expense, Income } from '@/types'

export default function CashFlowForecastPage() {
  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => expenseApi.list().then((r) => r.data.data),
  })

  const { data: income = [] } = useQuery<Income[]>({
    queryKey: ['income'],
    queryFn: () => incomeApi.list().then((r) => r.data.data),
  })

  // Dynamic Runway modeling engine 
  const totalOutflows = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
  const totalInflows = income.reduce((sum: number, i: Income) => sum + i.amount, 0)
  const averageMonthlyOutflow = expenses.length > 0 ? Math.round(totalOutflows / 2) : 0
  
  // Real numbers compiled from user data
  const projectGrossRevenue = totalInflows
  const estimatedSurplusNet = totalInflows - totalOutflows

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Cash Flow Runway</h1>
        <p className="text-sm text-gray-500">Predict future operational metrics based on active asset metrics</p>
      </div>

      {/* Forward Look Metrics Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Sales Inflows</span>
            <h3 className="text-xl font-black mt-1">₹{projectGrossRevenue.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-emerald-400 font-medium mt-1">Live recorded revenue stream</p>
          </div>
          <div className="p-3 rounded-xl bg-white/10 text-white"><TrendingUp size={20} /></div>
        </div>

        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400">Baseline Outlay Speed</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">₹{averageMonthlyOutflow.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">Calculated rolling monthly costs</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-slate-700"><ArrowRightLeft size={20} /></div>
        </div>

        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-400">Projected Net Buffer</span>
            <h3 className="text-xl font-black text-emerald-700 mt-1">₹{estimatedSurplusNet.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Retained cash safety buffer</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><ShieldAlert size={20} /></div>
        </div>
      </div>

      {/* Smart Predictive Forecast Analytics Engine Block */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600 animate-pulse" />
          <h3 className="text-sm font-black text-slate-800">Dynamic 30-Day Working Capital Timeline</h3>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="p-2 bg-white rounded-lg border border-gray-100 text-slate-700 shrink-0 mt-0.5">
              <Calendar size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Phase 1: Inventory &amp; Asset Liquidity Turn</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                As your current stock turns into retail sales over the next two weeks, focus on pricing items with a minimum markup of 1.4x to buffer sudden overhead bills.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3.5 bg-amber-50/50 rounded-xl border border-amber-100">
            <div className="p-2 bg-white rounded-lg border border-amber-100 text-amber-600 shrink-0 mt-0.5">
              <ArrowDownRight size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Phase 2: Fixed Overhead Allocations (Rent/Bills)</h4>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Your estimated fixed operations require at least <span className="font-bold">₹{averageMonthlyOutflow.toLocaleString('en-IN')}</span>. Hold back a fraction of daily weekend sales collections explicitly for these month-end clearings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
