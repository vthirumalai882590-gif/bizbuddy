import axios from 'axios'
import { auth } from './firebase'

const BASE_URL = '/api'
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject Firebase ID token on every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global error handling block mapping
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error ?? err.message ?? 'Something went wrong'
    if (err.response?.status === 401) {
      auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(new Error(msg))
  }
)

// ── Expense APIs ──────────────────────────────────────────────
export const expenseApi = {
  list:   (params?: Record<string, string>) => api.get('/expenses', { params }),
  create: (data: FormData | Record<string, unknown>) =>
    api.post('/expenses', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  summary: (period: string) => api.get(`/expenses/summary?period=${period}`),
  getAiCoach: () => api.get('/expenses/ai-coach'),
  chat: (message: string, context: string, history?: any[]) => api.post('/expenses/chat', { message, context, history }),
}

// ── Income APIs ───────────────────────────────────────────────
export const incomeApi = {
  list:   (params?: Record<string, string>) => api.get('/income', { params }),
  create: (data: Record<string, unknown>) => api.post('/income', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/income/${id}`, data),
  delete: (id: string) => api.delete(`/income/${id}`),
  summary: (period: string) => api.get(`/income/summary?period=${period}`),
}

// ── Receipt APIs ──────────────────────────────────────────────
export const receiptApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('receipt', file)
    return api.post('/receipts/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => api.get('/receipts'),
  get:  (id: string) => api.get(`/receipts/${id}`),
  link: (receiptId: string, expenseId: string) =>
    api.post(`/receipts/${receiptId}/link`, { expenseId }),
  remove: (id: string) => api.delete(`/receipts/${id}`),
  retry:  (id: string) => api.post(`/receipts/${id}/retry`),
}

// ── AI / Chat APIs ────────────────────────────────────────────
export const aiApi = {
  chat: (messages: { role: string; content: string }[]) =>
    api.post('/ai/chat', { messages }),
  analyzeHealth: () => api.get('/ai/business-health'),
  generateMarketing: (data: Record<string, unknown>) =>
    api.post('/ai/marketing', data),
  generateWebsite: (data: Record<string, unknown>) =>
    api.post('/ai/website', data),
}

// ── Report APIs ───────────────────────────────────────────────
export const reportApi = {
  financialSummary: (period: string) => api.get(`/reports/financial?period=${period}`),
  loanReadiness: () => api.post('/reports/loan-readiness'),
  downloadPdf: (reportId: string) =>
    api.get(`/reports/${reportId}/pdf`, { responseType: 'blob' }),
}

// ── Marketing APIs ────────────────────────────────────────────
export const marketingApi = {
  posts: () => api.get('/marketing/posts'),
  createPost: (data: Record<string, unknown>) => api.post('/marketing/posts', data),
  schedule: (postId: string, scheduledAt: string) =>
    api.post(`/marketing/posts/${postId}/schedule`, { scheduledAt }),
  publish: (postId: string) => api.post(`/marketing/posts/${postId}/publish`),
  festivals: () => api.get('/marketing/festivals'),
}

// ── Website APIs ──────────────────────────────────────────────
export const websiteApi = {
  get:     () => api.get('/website'),
  create:  (data: Record<string, unknown>) => api.post('/website', data),
  update:  (data: Record<string, unknown>) => api.put('/website', data),
  publish: () => api.post('/website/publish'),
}

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  recentActivity: () => api.get('/dashboard/activity'),
}