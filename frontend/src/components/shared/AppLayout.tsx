import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Layers, TrendingUp, TrendingDown,
  FileText, CreditCard, Megaphone, Globe, Bot,
  Settings, LogOut, Menu, Bell, ChevronDown,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

// ─── UPDATED NAVIGATION MATRIX ──────────────────────────────────────────────
const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, key: 'dashboard' },
  { to: '/investments',  icon: TrendingDown,    key: 'investments' }, 
  { to: '/profit-loss',  icon: TrendingUp,      key: 'profitLoss' },
  { to: '/stocks',       icon: Layers,          key: 'storeStock' }, 
  { to: '/reports',      icon: FileText,        key: 'reports' },
  { to: '/loan',         icon: CreditCard,      key: 'loanReadiness' },
  { to: '/marketing',    icon: Megaphone,       key: 'marketing' },
  { to: '/website',      icon: Globe,           key: 'aiWebsite' },
  { to: '/ai-advisor',   icon: Bot,             key: 'aiAdvisor' },
  { to: '/settings',     icon: Settings,        key: 'settings' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch {
      toast.error('Failed to logout')
    }
  }

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={clsx(
        'flex flex-col bg-white border-r border-gray-100 h-full',
        mobile ? 'w-72 p-4' : 'w-64 p-4 hidden lg:flex'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <span className="font-display font-bold text-gray-900 text-lg leading-none">BizBuddy</span>
          <span className="block text-xs text-brand-600 font-medium">AI</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx('nav-link', isActive && 'active')
            }
          >
            <Icon size={18} />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-gray-100 pt-4 mt-4">
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} className="w-8 h-8 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-700">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.businessName ?? user?.email}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {profileOpen && (
            <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <NavLink
                to="/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setProfileOpen(false)}
              >
                <Settings size={15} /> {t('settings')}
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} /> {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2">
            <span className="badge badge-green capitalize">{user?.plan ?? 'free'}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}