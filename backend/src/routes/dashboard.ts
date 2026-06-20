import { Router } from 'express';
import { loadExpenses, loadIncome } from '../services/database';
import { receipts } from './receipts';

const router = Router();

router.get('/overview', async (req: any, res: any) => {
  const expenses = loadExpenses();
  const income = loadIncome();

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(1)) : 0;

  // health score calculation: base 60, adjust on margins and consistency
  let healthScore = 60;
  if (profitMargin > 0) {
    healthScore += Math.min(25, Math.round(profitMargin * 0.5));
  } else if (profitMargin < 0) {
    healthScore -= Math.min(30, Math.round(Math.abs(profitMargin) * 0.5));
  }
  healthScore += Math.min(15, (expenses.length + income.length) * 2);
  healthScore = Math.max(10, Math.min(100, healthScore));

  // Generate dynamic 14-day cash flow history chart nodes
  const cashFlow = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const dateKey = d.toISOString().split('T')[0];

    const dayIncome = income
      .filter((inc) => inc.date === dateKey)
      .reduce((sum, inc) => sum + inc.amount, 0);

    const dayExpense = expenses
      .filter((exp) => exp.date === dateKey)
      .reduce((sum, exp) => sum + exp.amount, 0);

    return {
      date: dateStr,
      income: dayIncome,
      expense: dayExpense,
    };
  });

  res.json({
    success: true,
    data: {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      healthScore,
      loanScore: healthScore,
      receiptCount: receipts.length,
      pendingActions: receipts.filter(r => r.status === 'processing').length,
      cashFlow,
    },
  });
});

router.get('/activity', async (req: any, res: any) => {
  const expenses = loadExpenses();
  const income = loadIncome();

  const activities: any[] = [];

  expenses.forEach((e) => {
    activities.push({
      id: e.id,
      type: 'expense',
      description: e.description || `Expense: ${e.category}`,
      amount: e.amount,
      createdAt: e.createdAt || new Date(e.date).toISOString(),
    });
  });

  income.forEach((i) => {
    activities.push({
      id: i.id,
      type: 'income',
      description: i.description || `Income: ${i.source}`,
      amount: i.amount,
      createdAt: i.createdAt || new Date(i.date).toISOString(),
    });
  });

  receipts.forEach((r) => {
    activities.push({
      id: r.id,
      type: 'receipt',
      description: `Receipt scanned — ${r.extractedData?.vendor || 'Processing'}`,
      createdAt: r.createdAt,
    });
  });

  // Sort by date/createdAt descending
  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    data: activities.slice(0, 5),
  });
});

export default router;