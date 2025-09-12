import { User } from '@prisma/client';
import { Request } from 'express';

export interface DownloadResult {
    url: string;
    success: boolean;
    message: string;
    fileName?: string;
    downloadUrl?: string;
}

// User types using Prisma generated types
export type UserWithoutPassword = Omit<User, 'passwordHash'>;

export interface UserRegistration {
    username: string;
    email: string;
    password: string;
}

export interface UserLogin {
    email: string; // Can be either username or email
    password: string;
}

export interface AuthResponse {
    user: UserWithoutPassword;
    token: string;
}

export interface JwtPayload {
    userId: number;
    email: string;
    username: string;
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
} 