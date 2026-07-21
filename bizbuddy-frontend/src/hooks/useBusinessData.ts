import { useState, useEffect } from 'react'
import { expenseApi, incomeApi } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

export interface FinancialMetrics {
  totalSalesInflow: number
  stockInvestments: number
  netMarginStatus: number
}

export function useBusinessData() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalSalesInflow: 0,
    stockInvestments: 0,
    netMarginStatus: 0
  })
  const [storeContext, setStoreContext] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        // 1. Pull storefront website information if it exists
        const storageKey = 'bizbuddy_storefront_ledger_' + (user?.uid || 'demo-user')
        const savedLedger = localStorage.getItem(storageKey)
        if (savedLedger) {
          const parsed = JSON.parse(savedLedger)
          if (active) {
            setStoreContext(parsed)
            if (parsed.products) setProducts(parsed.products)
          }
        } else {
          if (active) {
            setStoreContext(null)
            setProducts([])
          }
        }

        // 2. Fetch live data from backend income and expenses
        const [incomeRes, expenseRes] = await Promise.all([
          incomeApi.list(),
          expenseApi.list()
        ])
        
        const incomeList = incomeRes.data?.data || []
        const expenseList = expenseRes.data?.data || []
        
        const totalSalesInflow = incomeList.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0)
        const stockInvestments = expenseList.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        const netMarginStatus = totalSalesInflow - stockInvestments

        if (active) {
          setMetrics({
            totalSalesInflow,
            stockInvestments,
            netMarginStatus
          })
        }
      } catch (error) {
        console.error('Failed to parse financial states:', error)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [user])

  const syncStorefrontData = (payload: any) => {
    try {
      const storageKey = 'bizbuddy_storefront_ledger_' + (user?.uid || 'demo-user')
      localStorage.setItem(storageKey, JSON.stringify(payload))
      setStoreContext(payload)
      if (payload.products) setProducts(payload.products)
    } catch (error) {
      console.error('Failed to sync storefront data:', error)
    }
  }

  return {
    metrics,
    products,
    storeContext,
    syncStorefrontData,
    predictions: [
      { date: 'Next Week', revenue: metrics.totalSalesInflow * 1.15, expenses: metrics.stockInvestments * 0.8, profit: 12000, stockValue: metrics.stockInvestments }
    ],
    isLoading
  }
}