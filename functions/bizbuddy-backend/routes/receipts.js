"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receipts = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const genai_1 = require("@google/genai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
// Maintain export for backward compatibility or imports in other routes
exports.receipts = [];
const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const upload = (0, multer_1.default)({
    dest: UPLOADS_DIR,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const AI_PROMPT = `You are a receipt scanner. Analyze this receipt image and extract all information.
Return a valid JSON object matching exactly this structure:
{
  "vendor": "store name here",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "item name", "quantity": 1, "unitPrice": 100, "totalPrice": 100}
  ],
  "taxAmount": 0,
  "totalAmount": 500
}
If you cannot read something clearly, make a reasonable estimate.
All prices must be numbers, not strings.`;
// ─── GET: LIST SYSTEM RECORDS ────────────────────────────────────────
router.get('/', async (req, res) => {
    const userId = req.uid || 'demo-user';
    const list = await (0, database_1.loadReceipts)(userId);
    // Sync the export array just in case other files read it
    exports.receipts = list;
    res.json({ success: true, data: list });
});
// ─── POST: INITIAL FILE UPLOAD & BACKGROUND TEXT EXTRACTION ──────────
router.post('/upload', upload.single('receipt'), async (req, res) => {
    const userId = req.uid || 'demo-user';
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const host = req.get('host');
        const protocol = req.protocol;
        const receipt = {
            id: Date.now().toString(),
            userId: userId,
            imageUrl: `${protocol}://${host}/uploads/${req.file.filename}`,
            status: 'processing',
            createdAt: new Date().toISOString(),
            _localPath: req.file.path,
            _mimeType: req.file.mimetype,
        };
        const list = await (0, database_1.loadReceipts)(userId);
        list.unshift(receipt);
        await (0, database_1.saveReceipts)(list, userId);
        exports.receipts = list;
        let finalReceipt = { ...receipt };
        // Run the Gemini Vision extraction synchronously before sending response
        try {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error("GEMINI_API_KEY variable is missing inside the server .env profile");
            }
            const fileData = fs_1.default.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            const response = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
                contents: [
                    AI_PROMPT,
                    {
                        inlineData: {
                            mimeType: req.file.mimetype,
                            data: base64Image,
                        },
                    },
                ],
                config: {
                    responseMimeType: 'application/json',
                },
            });
            const text = response.text;
            let clean = text.trim();
            if (clean.includes('```')) {
                clean = clean.replace(/```json|```/g, '').trim();
            }
            const extractedData = JSON.parse(clean);
            const updateList = await (0, database_1.loadReceipts)(userId);
            const index = updateList.findIndex(r => r.id === receipt.id);
            if (index !== -1) {
                updateList[index] = {
                    ...updateList[index],
                    status: 'completed',
                    extractedData: {
                        vendor: extractedData.vendor || 'Unknown Vendor',
                        date: extractedData.date || new Date().toISOString().split('T')[0],
                        items: extractedData.items || [],
                        taxAmount: Number(extractedData.taxAmount) || 0,
                        totalAmount: Number(extractedData.totalAmount) || 0,
                        amount: Number(extractedData.totalAmount) || 0,
                    },
                };
                finalReceipt = updateList[index];
                await (0, database_1.saveReceipts)(updateList, userId);
                exports.receipts = updateList;
            }
        }
        catch (aiError) {
            console.error('Gemini Vision exception pipeline loop:', aiError);
            const updateList = await (0, database_1.loadReceipts)(userId);
            const index = updateList.findIndex(r => r.id === receipt.id);
            if (index !== -1) {
                updateList[index] = {
                    ...updateList[index],
                    status: 'failed',
                    errorDetails: aiError.message || 'Parsing failure context'
                };
                finalReceipt = updateList[index];
                await (0, database_1.saveReceipts)(updateList, userId);
                exports.receipts = updateList;
            }
        }
        res.json({ success: true, data: finalReceipt });
    }
    catch (error) {
        console.error('Core routing pipeline upload error:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, error: 'Upload process breakdown' });
    }
});
// ─── GET: POLL SINGLE RECEIPT STATUS ─────────────────────────────────
router.get('/:id', async (req, res) => {
    const userId = req.uid || 'demo-user';
    const list = await (0, database_1.loadReceipts)(userId);
    const receipt = list.find(r => r.id === req.params.id);
    if (!receipt) {
        return res.status(404).json({ success: false, error: 'Receipt context not found' });
    }
    res.json({ success: true, data: receipt });
});
// ─── POST: LINK EXISTING TRANSACTION ─────────────────────────────────
router.post('/:receiptId/link', async (req, res) => {
    const userId = req.uid || 'demo-user';
    const { expenseId } = req.body;
    const list = await (0, database_1.loadReceipts)(userId);
    const index = list.findIndex(r => r.id === req.params.receiptId);
    if (index !== -1) {
        list[index].linkedExpenseId = expenseId;
        await (0, database_1.saveReceipts)(list, userId);
        exports.receipts = list;
    }
    res.json({ success: true, message: 'Receipt linked to expense successfully' });
});
// ─── DELETE: REMOVE TRANSCRIPTION AND DISK STORAGE ───────────────────
router.delete('/:id', async (req, res) => {
    const userId = req.uid || 'demo-user';
    try {
        const targetId = req.params.id;
        const list = await (0, database_1.loadReceipts)(userId);
        const targetReceipt = list.find(r => r.id === targetId);
        if (!targetReceipt) {
            return res.status(404).json({ success: false, error: 'Receipt details matching target missing' });
        }
        if (targetReceipt._localPath && fs_1.default.existsSync(targetReceipt._localPath)) {
            try {
                fs_1.default.unlinkSync(targetReceipt._localPath);
            }
            catch (unlinkErr) {
                console.error('Local attachment cleanup warning:', unlinkErr);
            }
        }
        const filteredList = list.filter(r => r.id !== targetId);
        await (0, database_1.saveReceipts)(filteredList, userId);
        exports.receipts = filteredList;
        return res.json({ success: true, message: 'Receipt context removed' });
    }
    catch (err) {
        console.error('Destruction middleware crash log:', err);
        return res.status(500).json({ success: false, error: 'Failed to clear local assets' });
    }
});
// ─── POST: MANUAL RETRY FOR FAILED CONTEXT ENTRIES ───────────────────
router.post('/:id/retry', async (req, res) => {
    const userId = req.uid || 'demo-user';
    try {
        const targetId = req.params.id;
        const list = await (0, database_1.loadReceipts)(userId);
        const index = list.findIndex(r => r.id === targetId);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Requested receipt context missing' });
        }
        const targetReceipt = list[index];
        if (!targetReceipt._localPath || !fs_1.default.existsSync(targetReceipt._localPath)) {
            return res.status(400).json({
                success: false,
                error: 'Original source file asset cleared from storage disk. Please perform a fresh upload.'
            });
        }
        list[index].status = 'processing';
        await (0, database_1.saveReceipts)(list, userId);
        exports.receipts = list;
        let finalReceipt = { ...list[index] };
        try {
            const fileData = fs_1.default.readFileSync(targetReceipt._localPath);
            const base64Image = fileData.toString('base64');
            const response = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
                contents: [
                    AI_PROMPT,
                    {
                        inlineData: {
                            mimeType: targetReceipt._mimeType || 'image/jpeg',
                            data: base64Image,
                        },
                    },
                ],
                config: {
                    responseMimeType: 'application/json',
                },
            });
            const text = response.text;
            let clean = text.trim();
            if (clean.includes('```')) {
                clean = clean.replace(/```json|```/g, '').trim();
            }
            const extractedData = JSON.parse(clean);
            const updateList = await (0, database_1.loadReceipts)(userId);
            const updateIdx = updateList.findIndex(r => r.id === targetId);
            if (updateIdx !== -1) {
                updateList[updateIdx] = {
                    ...updateList[updateIdx],
                    status: 'completed',
                    extractedData: {
                        vendor: extractedData.vendor || 'Unknown Vendor',
                        date: extractedData.date || new Date().toISOString().split('T')[0],
                        items: extractedData.items || [],
                        taxAmount: Number(extractedData.taxAmount) || 0,
                        totalAmount: Number(extractedData.totalAmount) || 0,
                        amount: Number(extractedData.totalAmount) || 0,
                    },
                };
                finalReceipt = updateList[updateIdx];
                await (0, database_1.saveReceipts)(updateList, userId);
                exports.receipts = updateList;
            }
        }
        catch (aiError) {
            console.error('Worker tracking failure context recovery exception:', aiError);
            const errList = await (0, database_1.loadReceipts)(userId);
            const errIdx = errList.findIndex(r => r.id === targetId);
            if (errIdx !== -1) {
                errList[errIdx].status = 'failed';
                errList[errIdx].errorDetails = aiError.message || 'Parsing failure context';
                finalReceipt = errList[errIdx];
                await (0, database_1.saveReceipts)(errList, userId);
                exports.receipts = errList;
            }
        }
        res.json({ success: true, data: finalReceipt });
    }
    catch (error) {
        console.error('Reprocessing route failure:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
