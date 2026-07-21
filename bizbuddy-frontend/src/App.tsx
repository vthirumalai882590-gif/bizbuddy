import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AppLayout from '@/components/shared/AppLayout'

// Pages
import LoginPage       from '@/pages/LoginPage'
import OnboardingPage  from '@/pages/OnboardingPage'
import DashboardPage   from '@/pages/DashboardPage'
import StocksPage      from '@/pages/StocksPage' // ✅ Fixed path to use uniform @ alias
import ReportsPage     from '@/pages/ReportsPage'
import LoanPage        from '@/pages/LoanPage'
import MarketingPage   from '@/pages/MarketingPage'
import WebsitePage     from '@/pages/WebsitePage'
import AIAdvisorPage   from '@/pages/AIAdvisorPage'
import SettingsPage    from '@/pages/SettingsPage'

// New analytics pages
import ProfitLossPage       from '@/pages/ProfitLossPage'
import InvestmentsPage      from '@/pages/InvestmentsPage'
import ExpenseBreakdownPage from '@/pages/ExpenseBreakdownPage'
import CashFlowForecastPage from '@/pages/CashFlowForecastPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/onboarding"  element={<OnboardingPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Redirect root to dashboard */}
            <Route index                element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<DashboardPage />} />

            {/* Analytics pages */}
            <Route path="investments"   element={<InvestmentsPage />} />
            <Route path="profit-loss"   element={<ProfitLossPage />} />
            <Route path="expenses"      element={<ExpenseBreakdownPage />} />
            <Route path="cash-flow"     element={<CashFlowForecastPage />} />

            {/* Updated path match for Store Stock ledger */}
            <Route path="stocks"        element={<StocksPage />} />

            <Route path="reports"       element={<ReportsPage />} />
            <Route path="loan"          element={<LoanPage />} />
            <Route path="marketing"     element={<MarketingPage />} />
            <Route path="website"       element={<WebsitePage />} />
            <Route path="ai-advisor"    element={<AIAdvisorPage />} />
            <Route path="settings"      element={<SettingsPage />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}