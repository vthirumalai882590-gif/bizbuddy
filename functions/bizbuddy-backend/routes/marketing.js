"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/posts', async (req, res) => res.json({ success: true, data: [] }));
router.post('/posts', async (req, res) => res.json({ success: true, data: { id: Date.now().toString(), ...req.body, status: 'draft', createdAt: new Date().toISOString() } }));
router.get('/festivals', async (req, res) => res.json({
    success: true,
    data: [
        { name: 'Diwali', date: 'Oct 2024', emoji: '🪔' },
        { name: 'Dussehra', date: 'Oct 2024', emoji: '🏹' },
        { name: 'Christmas', date: 'Dec 2024', emoji: '🎄' },
        { name: 'New Year', date: 'Jan 2025', emoji: '🎆' },
    ],
}));
exports.default = router;
