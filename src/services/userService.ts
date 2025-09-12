import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { UserRegistration, UserLogin, UserWithoutPassword } from '../types';

export class UserService {
  // Register a new user
  static async registerUser(userData: UserRegistration): Promise<UserWithoutPassword> {
    const { username, email, password } = userData;
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert new user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return user;
  }
  
  // Login user
  static async loginUser(loginData: UserLogin): Promise<Omit<User, 'passwordHash'>> {
    const { email, password } = loginData;
    
    // Find user by email OR username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: email } // Treat the email field as potentially containing username
        ]
      }
    });
    
    if (!user) {
      throw new Error('Invalid username/email or password');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid username/email or password');
    }
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  // Get user by ID
  static async getUserById(id: number): Promise<UserWithoutPassword | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return user;
  }
  
  // Get user by email
  static async getUserByEmail(email: string): Promise<UserWithoutPassword | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return user;
  }
  
  // Update user profile
  static async updateUser(id: number, updates: Partial<Pick<UserWithoutPassword, 'username' | 'email'>>): Promise<UserWithoutPassword> {
    const updateData: any = {};
    
    if (updates.username) {
      updateData.username = updates.username;
    }
    
    if (updates.email) {
      updateData.email = updates.email;
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return user;
  }
  
  // Change password
  static async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const user = await prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash }
    });
  }
}
