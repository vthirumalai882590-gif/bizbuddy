"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let app;
if ((0, app_1.getApps)().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'focus-42c33';
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            app = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
                projectId,
            });
        }
        else {
            app = (0, app_1.initializeApp)({ projectId });
        }
        console.log('✅ Firebase Admin SDK initialized');
    }
    catch (err) {
        console.error('❌ Error initializing Firebase Admin SDK:', err.message);
        // Safe mock fallback initialization to prevent process-level import crash
        app = (0, app_1.initializeApp)({ projectId }, 'fallback-app');
    }
}
else {
    app = (0, app_1.getApps)()[0];
}
exports.auth = (0, auth_1.getAuth)(app);
exports.default = app;
