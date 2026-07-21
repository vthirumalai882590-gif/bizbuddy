"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessContext = getBusinessContext;
const database_1 = require("./database");
async function getBusinessContext(uid) {
    const expenses = await (0, database_1.loadExpenses)(uid);
    const income = await (0, database_1.loadIncome)(uid);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const expenseMap = {};
    expenses.forEach((e) => {
        expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
    });
    const topExpenseCategories = Object.entries(expenseMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
    const incomeMap = {};
    income.forEach((i) => {
        incomeMap[i.source] = (incomeMap[i.source] || 0) + i.amount;
    });
    const topIncomeSources = Object.entries(incomeMap)
        .map(([source, amount]) => ({ source, amount }))
        .sort((a, b) => b.amount - a.amount);
    return {
        totalIncome,
        totalExpenses,
        netProfit,
        topExpenseCategories,
        topIncomeSources,
        transactionCount: expenses.length + income.length,
    };
}
