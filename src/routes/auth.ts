import { Router, Request, Response } from 'express';
import { UserService } from '../services/userService';
import { JwtService } from '../services/jwtService';
import { authenticateToken } from '../middleware/authMiddleware';
import { UserRegistration, UserLogin, AuthenticatedRequest } from '../types';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData: UserRegistration = req.body;
    
    // Validate input
    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    if (userData.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    if (userData.username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Register user
    const user = await UserService.registerUser(userData);
    
    // Generate JWT token
    const token = JwtService.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: UserLogin = req.body;
    
    // Validate input
    if (!loginData.email || !loginData.password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }
    
    // Login user
    const user = await UserService.loginUser(loginData);
    
    // Generate JWT token
    const token = JwtService.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username
    });
    
    res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid username/email or password')) {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout user (blacklist token)
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token && req.user) {
      await JwtService.blacklistToken(token, req.user.userId);
    }
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const user = await UserService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { username, email } = req.body;
    
    // Validate input
    if (username && username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    const updatedUser = await UserService.updateUser(req.user.userId, { username, email });
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    await UserService.changePassword(req.user.userId, currentPassword, newPassword);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('incorrect')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Refresh token (optional - you can implement this if you want longer sessions)
router.post('/refresh', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Generate new token
    const newToken = JwtService.generateToken({
      userId: req.user.userId,
      email: req.user.email,
      username: req.user.username
    });
    
    // Blacklist old token
    const oldToken = req.headers.authorization?.substring(7);
    if (oldToken) {
      await JwtService.blacklistToken(oldToken, req.user.userId);
    }
    
    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
