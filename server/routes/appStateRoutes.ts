import { Router, Request, Response, RequestHandler } from 'express';
import prisma from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper to get a user by email
const getUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

// Initialize app state for user
router.post('/init', async (req: Request<{}, any, { email: string }>, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    let appState = await prisma.appState.findUnique({
      where: { userId: user.id },
    });

    if (!appState) {
      appState = await prisma.appState.create({
        data: {
          userId: user.id,
          units: 'imperial',
          theme: 'dark',
          temperatureUnit: 'fahrenheit',
          hasCompletedOnboarding: false,
        },
      });
    }

    res.json({
      settings: {
        units: appState.units,
        theme: appState.theme,
        temperatureUnit: appState.temperatureUnit,
      },
      hasCompletedOnboarding: appState.hasCompletedOnboarding,
    });
  } catch (error) {
    console.error('Error initializing app state:', error);
    res.status(500).json({ error: 'Failed to initialize app state' });
  }
});

// Get app state
router.get('/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;

    const appState = await prisma.appState.findUnique({
      where: { userId },
    });

    if (!appState) {
      return res.status(404).json({ error: 'App state not found' });
    }

    res.json({
      settings: {
        units: appState.units,
        theme: appState.theme,
        temperatureUnit: appState.temperatureUnit,
      },
      hasCompletedOnboarding: appState.hasCompletedOnboarding,
    });
  } catch (error) {
    console.error('Error getting app state:', error);
    res.status(500).json({ error: 'Failed to get app state' });
  }
}) as RequestHandler<{ userId: string }>);

// Update app state
router.put('/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;
    const { units, theme, temperatureUnit, hasCompletedOnboarding } = req.body;

    const appState = await prisma.appState.update({
      where: { userId },
      data: {
        ...(units && { units }),
        ...(theme && { theme }),
        ...(temperatureUnit && { temperatureUnit }),
        ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding }),
      },
    });

    res.json({
      settings: {
        units: appState.units,
        theme: appState.theme,
        temperatureUnit: appState.temperatureUnit,
      },
      hasCompletedOnboarding: appState.hasCompletedOnboarding,
    });
  } catch (error) {
    console.error('Error updating app state:', error);
    res.status(500).json({ error: 'Failed to update app state' });
  }
}) as RequestHandler<{ userId: string }>);

// Save locations
router.post('/locations/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, moisture, latitude, longitude } = req.body;

    const location = await prisma.savedLocation.upsert({
      where: {
        userId_name: { userId, name },
      },
      update: {
        moisture,
        latitude,
        longitude,
      },
      create: {
        id: uuidv4(),
        userId,
        name,
        moisture,
        latitude,
        longitude,
      },
    });

    res.json(location);
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
}) as RequestHandler<{ userId: string }>);

// Get all locations for user
router.get('/locations/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;

    const locations = await prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(locations);
  } catch (error) {
    console.error('Error getting locations:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
}) as RequestHandler<{ userId: string }>);

// Delete location
router.delete('/locations/:userId/:name', (async (req, res) => {
  try {
    const { userId, name } = req.params;

    await prisma.savedLocation.delete({
      where: {
        userId_name: { userId, name },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
}) as RequestHandler<{ userId: string; name: string }>);

// Save API config
router.post('/api-configs/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, provider, apiKey, model } = req.body;

    // Deactivate all other configs if this is being set as active
    if (req.body.isActive) {
      await prisma.apiConfig.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }

    const config = await prisma.apiConfig.create({
      data: {
        id: uuidv4(),
        userId,
        name,
        provider,
        apiKey,
        model,
        isActive: req.body.isActive || false,
      },
    });

    res.json(config);
  } catch (error) {
    console.error('Error saving API config:', error);
    res.status(500).json({ error: 'Failed to save API config' });
  }
}) as RequestHandler<{ userId: string }>);

// Get API configs for user
router.get('/api-configs/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;

    const configs = await prisma.apiConfig.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        provider: true,
        model: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(configs);
  } catch (error) {
    console.error('Error getting API configs:', error);
    res.status(500).json({ error: 'Failed to get API configs' });
  }
}) as RequestHandler<{ userId: string }>);

// Update API config
router.put('/api-configs/:userId/:configId', (async (req, res) => {
  try {
    const { userId, configId } = req.params;
    const { name, model, isActive } = req.body;

    if (isActive) {
      await prisma.apiConfig.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }

    const config = await prisma.apiConfig.update({
      where: { id: configId },
      data: {
        ...(name !== undefined && { name }),
        ...(model && { model }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        provider: true,
        model: true,
        isActive: true,
      },
    });

    res.json(config);
  } catch (error) {
    console.error('Error updating API config:', error);
    res.status(500).json({ error: 'Failed to update API config' });
  }
}) as RequestHandler<{ userId: string; configId: string }>);

// Delete API config
router.delete('/api-configs/:userId/:configId', (async (req, res) => {
  try {
    const { userId, configId } = req.params;

    await prisma.apiConfig.delete({
      where: { id: configId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API config:', error);
    res.status(500).json({ error: 'Failed to delete API config' });
  }
}) as RequestHandler<{ userId: string; configId: string }>);

// Save health history entry
router.post('/health-history/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;
    const { date, cropType, location, healthDescription, imageBase64, plan } = req.body;

    const entry = await prisma.healthHistoryEntry.create({
      data: {
        id: uuidv4(),
        userId,
        date,
        cropType,
        location,
        healthDescription,
        imageBase64,
        plan,
      },
    });

    res.json(entry);
  } catch (error) {
    console.error('Error saving health history:', error);
    res.status(500).json({ error: 'Failed to save health history' });
  }
}) as RequestHandler<{ userId: string }>);

// Get health history for user
router.get('/health-history/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;
    const { limit = '50', cropType, location } = req.query as { limit?: string, cropType?: string, location?: string };

    const entries = await prisma.healthHistoryEntry.findMany({
      where: {
        userId,
        ...(cropType && { cropType: String(cropType) }),
        ...(location && { location: String(location) }),
      },
      take: parseInt(limit) || 50,
      orderBy: { createdAt: 'desc' },
    });

    res.json(entries);
  } catch (error) {
    console.error('Error getting health history:', error);
    res.status(500).json({ error: 'Failed to get health history' });
  }
}) as RequestHandler<{ userId: string }>);

export default router;
