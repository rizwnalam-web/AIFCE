import { Router, Request, Response } from 'express';
import prisma from '../db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Helper function to hash password
const hashPassword = (password: string): string => {
  return crypto.pbkdf2Sync(password, 'salt', 1000, 64, 'sha512').toString('hex');
};

// Helper function to verify password
const verifyPassword = (password: string, hash: string): boolean => {
  return crypto.pbkdf2Sync(password, 'salt', 1000, 64, 'sha512').toString('hex') === hash;
};

// Helper function to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate password strength
const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      phone,
      streetAddress,
      city,
      state,
      country,
      zipCode,
    } = req.body;

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and password confirmation are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        streetAddress: streetAddress || null,
        city: city || null,
        state: state || null,
        country: country || null,
        zipCode: zipCode || null,
      },
    });

    // Create app state
    await prisma.appState.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        units: 'imperial',
        theme: 'dark',
        temperatureUnit: 'fahrenheit',
      },
    });

    // Create registration log
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.registrationLog.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        registrationType: 'email',
        ipAddress: req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        verificationToken,
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        streetAddress: user.streetAddress,
        city: user.city,
        state: user.state,
        country: user.country,
        zipCode: user.zipCode,
        isVerified: user.isVerified,
        isActive: user.isActive,
        registeredAt: user.registeredAt.toISOString(),
      },
      message: 'Registration successful! Please verify your email.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is disabled',
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    res.json({
      success: true,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        streetAddress: user.streetAddress,
        city: user.city,
        state: user.state,
        country: user.country,
        zipCode: user.zipCode,
        isVerified: user.isVerified,
        isActive: user.isActive,
        registeredAt: user.registeredAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
});

/**
 * GET /api/auth/user/:userId
 * Get user profile
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        streetAddress: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        isVerified: true,
        isActive: true,
        registeredAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        ...user,
        registeredAt: user.registeredAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    });
  }
});

/**
 * PUT /api/auth/user/:userId
 * Update user profile
 */
router.put('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      firstName,
      lastName,
      phone,
      profileImage,
      streetAddress,
      city,
      state,
      country,
      zipCode,
    } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(profileImage !== undefined && { profileImage }),
        ...(streetAddress !== undefined && { streetAddress }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country !== undefined && { country }),
        ...(zipCode !== undefined && { zipCode }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        streetAddress: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        isVerified: true,
        isActive: true,
        registeredAt: true,
        lastLogin: true,
      },
    });

    res.json({
      success: true,
      user: {
        ...user,
        registeredAt: user.registeredAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    if (!verifyPassword(currentPassword, user.password)) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Validate new password
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match',
      });
    }

    // Update password
    const hashedPassword = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
});

export default router;
