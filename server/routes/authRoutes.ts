import { Router } from 'express';
import prisma from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password, // NOTE: In production, passwords must be hashed (e.g., using bcrypt)!
        firstName,
        lastName,
      }
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session check endpoint (Placeholder for session management)
router.get('/session', (req, res) => {
  res.json({ user: null });
});

export default router;