"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
router.post('/seed', async (req, res) => {
    try {
        if (!req.uid)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const userId = req.uid;
        const success = await (0, database_1.seedSampleData)(userId);
        if (success) {
            return res.json({ success: true, message: 'Sample data loaded successfully' });
        }
        else {
            return res.status(500).json({ success: false, error: 'Failed to load sample data' });
        }
    }
    catch (err) {
        console.error('Error in /seed:', err);
        res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
});
exports.default = router;
