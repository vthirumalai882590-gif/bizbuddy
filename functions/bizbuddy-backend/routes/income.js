"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const income = await (0, database_1.loadIncome)(req.uid);
    res.json({ success: true, data: income });
});
router.post('/', async (req, res) => {
    const userId = req.uid || 'demo-user';
    const income = await (0, database_1.loadIncome)(userId);
    const newIncome = {
        id: Date.now().toString(),
        userId: userId,
        currency: 'INR',
        amount: Number(req.body.amount) || 0,
        source: req.body.source || 'sales',
        description: req.body.description || 'Counter Sales',
        date: req.body.date || new Date().toISOString().split('T')[0],
        customer: req.body.customer || 'Walk-in',
        paymentMethod: req.body.paymentMethod || 'upi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    income.unshift(newIncome);
    await (0, database_1.saveIncome)(income, userId);
    res.json({ success: true, data: newIncome });
});
router.delete('/:id', async (req, res) => {
    const userId = req.uid || 'demo-user';
    let income = await (0, database_1.loadIncome)(userId);
    const initialLength = income.length;
    income = income.filter(i => i.id !== req.params.id);
    if (income.length !== initialLength) {
        await (0, database_1.saveIncome)(income, userId);
        return res.json({ success: true, message: 'Income record pruned successfully' });
    }
    res.status(404).json({ success: false, error: 'Target record row not found' });
});
exports.default = router;
