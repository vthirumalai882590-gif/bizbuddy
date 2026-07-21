"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const firebase_1 = require("../services/firebase");
const authMiddleware = async (req, res, next) => {
    // Check for explicit x-demo-mode header or default to demo-user if no token present
    if (req.headers['x-demo-mode'] === 'true') {
        req.uid = 'demo-user';
        return next();
    }
    const authHeader = req.headers['x-authorization'] || req.headers['x-firebase-auth'] || req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.uid = 'demo-user';
        return next();
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await firebase_1.auth.verifyIdToken(token);
        req.uid = decodedToken.uid || 'demo-user';
        return next();
    }
    catch (error) {
        console.warn('[AuthMiddleware] ID token verification failed, falling back to demo-user:', error.message);
        req.uid = 'demo-user';
        return next();
    }
};
exports.authMiddleware = authMiddleware;
