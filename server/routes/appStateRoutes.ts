import { Router, Request, Response } from 'express';
import prisma from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper to get or create user
const getOrCreateUser = async (email: string) => {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email },
    });
  }
  return user;
};

// Initialize app state for user
router.post('/app-state/init', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await getOrCreateUser(email);

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
      userId: user.id,
      appState: {
        settings: {
          units: appState.units,
          theme: appState.theme,
          temperatureUnit: appState.temperatureUnit,
        },
        hasCompletedOnboarding: appState.hasCompletedOnboarding,
      },
    });
  } catch (error) {
    console.error('Error initializing app state:', error);
    res.status(500).json({ error: 'Failed to initialize app state' });
  }
});

// Get app state
router.get('/app-state/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

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
});

// Update app state
router.put('/app-state/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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
});

// Save locations
router.post('/locations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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
});

// Get all locations for user
router.get('/locations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const locations = await prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(locations);
  } catch (error) {
    console.error('Error getting locations:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// Delete location
router.delete('/locations/:userId/:name', async (req: Request, res: Response) => {
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
});

// Save API config
router.post('/api-configs/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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
});

// Get API configs for user
router.get('/api-configs/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

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
});

// Update API config
router.put('/api-configs/:userId/:configId', async (req: Request, res: Response) => {
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
        ...(name && { name }),
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
});

// Delete API config
router.delete('/api-configs/:userId/:configId', async (req: Request, res: Response) => {
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
});

// Save health history entry
router.post('/health-history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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
});

// Get health history for user
router.get('/health-history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, cropType, location } = req.query;

    const entries = await prisma.healthHistoryEntry.findMany({
      where: {
        userId,
        ...(cropType && { cropType: String(cropType) }),
        ...(location && { location: String(location) }),
      },
      take: parseInt(String(limit)),
      orderBy: { createdAt: 'desc' },
    });

    res.json(entries);
  } catch (error) {
    console.error('Error getting health history:', error);
    res.status(500).json({ error: 'Failed to get health history' });
  }
});

export default router;
