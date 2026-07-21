"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Clean TypeScript imports (TypeScript resolves these correctly for CommonJS)
const expenses_1 = __importDefault(require("./routes/expenses"));
const income_1 = __importDefault(require("./routes/income"));
const receipts_1 = __importDefault(require("./routes/receipts"));
const ai_1 = __importDefault(require("./routes/ai"));
const reports_1 = __importDefault(require("./routes/reports"));
const marketing_1 = __importDefault(require("./routes/marketing"));
const website_1 = __importDefault(require("./routes/website"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const auth_1 = require("./middleware/auth");
const seed_1 = __importDefault(require("./routes/seed"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5000',
        'http://localhost:5001'
    ];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow server-to-server or postman requests (no origin)
        if (!origin)
            return callback(null, true);
        // Check if the origin matches our allowed list or ends with known hosting domains
        const isAllowed = allowedOrigins.includes(origin)
            || origin.endsWith('.vercel.app')
            || origin.endsWith('.catalystserverless.com')
            || origin.endsWith('.catalystserverless.in')
            || origin.endsWith('.catalystapps.com')
            || origin.endsWith('.catalystapps.in');
        if (isAllowed) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS policy blocked request from origin: ${origin}`));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// Create uploads folder if it doesn't exist
const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express_1.default.static(UPLOADS_DIR));
app.use(express_1.default.urlencoded({ extended: true }));
// Normalize req.url for Catalyst Advanced IO serverless routing
app.use((req, _res, next) => {
    if (req.url.startsWith('/server/bizbuddy-backend')) {
        req.url = req.url.replace('/server/bizbuddy-backend', '') || '/';
    }
    next();
});
// Apply routes
app.use('/api/expenses', auth_1.authMiddleware, expenses_1.default);
app.use('/api/income', auth_1.authMiddleware, income_1.default);
app.use('/api/receipts', auth_1.authMiddleware, receipts_1.default);
app.use('/api/ai', auth_1.authMiddleware, ai_1.default);
app.use('/api/reports', auth_1.authMiddleware, reports_1.default);
app.use('/api/marketing', auth_1.authMiddleware, marketing_1.default);
app.use('/api/website', auth_1.authMiddleware, website_1.default);
app.use('/api/dashboard', auth_1.authMiddleware, dashboard_1.default);
app.use('/api/seed', auth_1.authMiddleware, seed_1.default);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve frontend static assets in production
const frontendDistPath = path_1.default.join(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDistPath)) {
    app.use(express_1.default.static(frontendDistPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
    });
}
// In Catalyst serverless, we export the app handler.
// In local dev, we start the HTTP server safely inside try-catch.
const isMain = require.main === module;
const isCatalyst = process.env.CATALYST_ENVIRONMENT || process.env.X_ZOHO_CATALYST_IS_CATALYST_ENV || process.env.CATALYST_ENV || process.env.X_ZOHO_CATALYST_IS_LOCAL;
if (isMain && !isCatalyst) {
    const server = app.listen(PORT, () => {
        console.log(`✅ Backend running at http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
        console.log('Server listen warning:', err.message);
    });
}
const handler = (req, res) => {
    return app(req, res);
};
module.exports = handler;
module.exports.default = handler;
module.exports.app = app;
