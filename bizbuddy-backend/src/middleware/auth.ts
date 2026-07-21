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
  // Check for explicit x-demo-mode header or default to demo-user if no token present
  if (req.headers['x-demo-mode'] === 'true') {
    req.uid = 'demo-user'
    return next()
  }

  const authHeader = (req.headers['x-authorization'] as string) || (req.headers['x-firebase-auth'] as string) || req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.uid = 'demo-user'
    return next()
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decodedToken = await auth.verifyIdToken(token)
    req.uid = decodedToken.uid || 'demo-user'
    return next()
  } catch (error: any) {
    console.warn('[AuthMiddleware] ID token verification failed, falling back to demo-user:', error.message)
    req.uid = 'demo-user'
    return next()
  }
}