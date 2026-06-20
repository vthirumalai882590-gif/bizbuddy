import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  uid?: string
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  req.uid = 'demo-user'
  next()
}