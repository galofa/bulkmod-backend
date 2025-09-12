import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../types';

export class JwtService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
  private static readonly TOKEN_EXPIRY = '24h';
  
  // Generate JWT token
  static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }
  
  // Verify JWT token
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Blacklist token (for logout)
  static async blacklistToken(token: string, userId: number): Promise<void> {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
    
    await prisma.userSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });
  }
  
  // Check if token is blacklisted
  static async isTokenBlacklisted(token: string, userId: number): Promise<boolean> {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        tokenHash: true
      }
    });
    
    for (const session of sessions) {
      const isMatch = await bcrypt.compare(token, session.tokenHash);
      if (isMatch) {
        return true; // Token is blacklisted
      }
    }
    
    return false; // Token is not blacklisted
  }
  
  // Clean up expired blacklisted tokens
  static async cleanupExpiredTokens(): Promise<void> {
    await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }
  
  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}
