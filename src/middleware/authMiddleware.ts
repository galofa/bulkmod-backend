import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwtService';
import { AuthenticatedRequest } from '../types';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization as string | undefined;
    const token = JwtService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }
    
    // Verify token
    const payload = JwtService.verifyToken(token);
    
    // Check if token is blacklisted
    const isBlacklisted = await JwtService.isTokenBlacklisted(token, payload.userId);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }
    
    // Add user info to request
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Authentication error' });
    }
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization as string | undefined;
    const token = JwtService.extractTokenFromHeader(authHeader);
    
    if (token) {
      try {
        const payload = JwtService.verifyToken(token);
        const isBlacklisted = await JwtService.isTokenBlacklisted(token, payload.userId);
        
        if (!isBlacklisted) {
          req.user = payload;
        }
      } catch (error) {
        // Token is invalid, but we continue without authentication
        console.log('Invalid token in optional auth:', error);
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
