// ──────────────────────────────────────────────────────────────────────────
// Add this to your existing src/services/api.ts (alongside dashboardApi).
// Assumes you already have an axios/fetch instance exported as `api` —
// adjust the import to match your actual client.
// ──────────────────────────────────────────────────────────────────────────
import { api } from './api' // your existing axios instance — adjust path if needed

export const analyticsApi = {
  profitLoss: () => api.get('/analytics/profit-loss'),
  profitLossAiCoach: () => api.get('/analytics/profit-loss/ai-coach'),
  investments: () => api.get('/analytics/investments'),
  investmentsAiCoach: () => api.get('/analytics/investments/ai-coach'),
  expensesBreakdown: () => api.get('/analytics/expenses-breakdown'),
  cashFlowForecast: () => api.get('/analytics/cash-flow-forecast'),
}