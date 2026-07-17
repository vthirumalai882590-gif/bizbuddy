import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Activity, ArrowUpRight, ArrowDownRight, Receipt, Megaphone } from 'lucide-react'
import { dashboardApi } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { clsx } from 'clsx'
import { format } from 'date-fns'

interface Overview {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  healthScore: number
  cashFlow: { date: string; income: number; expense: number }[]
}

interface ActivityItem {
  id: string
  type: 'expense' | 'income' | 'receipt' | 'marketing'
  description: string
  amount?: number
  createdAt: string
}

const EMPTY_OVERVIEW: Overview = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  profitMargin: 0,
  healthScore: 60,
  cashFlow: Array.from({ length: 14 }).map((_, i) => ({
    date: format(new Date(Date.now() - (13 - i) * 86400000), 'dd MMM'),
    income: 0,
    expense: 0,
  })),
}

const EMPTY_ACTIVITY: ActivityItem[] = []

const ACTIVITY_ICON = { 
  income: TrendingUp, 
  expense: TrendingDown, 
  receipt: Receipt, 
  marketing: Megaphone 
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const { data: overview = EMPTY_OVERVIEW } = useQuery<Overview>({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardApi.overview().then((r) => r.data.data),
    placeholderData: EMPTY_OVERVIEW,
  })

  const { data: activity = EMPTY_ACTIVITY } = useQuery<ActivityItem[]>({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.recentActivity().then((r) => r.data.data),
    placeholderData: EMPTY_ACTIVITY,
  })

  const firstName = user?.displayName?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">{t('welcomeBack')}, {firstName} 👋</h1>
        <p className="text-sm text-gray-500">{t('howBusinessIsDoing')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-xs flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-400">{t('totalSales')}</span>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><ArrowUpRight size={15} className="text-green-600" /></div>
          </div>
          <span className="text-lg font-black text-slate-800">₹{overview.totalIncome.toLocaleString('en-IN')}</span>
        </div>
        
        <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-xs flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-400">{t('totalExpenses')}</span>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><ArrowDownRight size={15} className="text-red-600" /></div>
          </div>
          <span className="text-lg font-black text-slate-800">₹{overview.totalExpenses.toLocaleString('en-IN')}</span>
        </div>
        
        <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-xs flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-400">{t('netProfit')}</span>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Wallet size={15} className="text-purple-600" /></div>
          </div>
          <span className="text-lg font-black text-slate-800">₹{overview.netProfit.toLocaleString('en-IN')}</span>
        </div>
        
        <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-xs flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-400">{t('healthScore')}</span>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Activity size={15} className="text-amber-600" /></div>
          </div>
          <span className="text-lg font-black text-slate-800">{overview.healthScore}/100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash flow chart */}
        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">{t('cashFlow14Days')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={overview.cashFlow}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`}
                contentStyle={{ borderRadius: 10, border: '1px solid #f3f4f6', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} fill="url(#incomeGrad)" />
              <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} fill="url(#expenseGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">{t('recentActivities')}</h3>
          <div className="space-y-4">
            {activity.map((item) => {
              const Icon = ACTIVITY_ICON[item.type]
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    item.type === 'income' && 'bg-green-50 text-green-600',
                    item.type === 'expense' && 'bg-red-50 text-red-600',
                    item.type === 'receipt' && 'bg-blue-50 text-blue-600',
                    item.type === 'marketing' && 'bg-purple-50 text-purple-600',
                  )}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{item.description}</p>
                    <p className="text-[10px] text-gray-400">{format(new Date(item.createdAt), 'dd MMM, hh:mm a')}</p>
                  </div>
                  {item.amount && (
                    <span className={clsx('text-xs font-black', item.type === 'income' ? 'text-green-600' : 'text-slate-700')}>
                      ₹{item.amount.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}