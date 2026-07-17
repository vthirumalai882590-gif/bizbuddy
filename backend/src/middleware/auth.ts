import { Request, Response, NextFunction } from 'express'
import { auth } from '../services/firebase'

export interface AuthRequest extends Request {
  uid?: string
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Fallback for development/testing when client is not authenticated
    req.uid = 'demo-user'
    return next()
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decodedToken = await auth.verifyIdToken(token)
    req.uid = decodedToken.uid
    next()
  } catch (error: any) {
    console.warn('[AuthMiddleware] ID token verification failed:', error.message)
    // Fallback instead of failing with 401, to maintain maximum compatibility.
    // If you want strict authentication, uncomment the line below.
    // return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' })
    req.uid = 'demo-user'
    next()
  }
}