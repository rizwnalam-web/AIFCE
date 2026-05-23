import { Router, Request, Response } from 'express';
import * as llmService from '../llmService';

const router = Router();

// Weather analysis
router.post('/weather-analysis', async (req: Request, res: Response) => {
  try {
    const { location, weatherData, userId } = req.body;

    if (!location || !weatherData) {
      return res.status(400).json({ error: 'Location and weather data are required' });
    }

    const analysis = await llmService.generateWeatherAnalysis(
      location,
      weatherData,
      userId
    );

    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing weather:', error);
    res.status(500).json({
      error: `Failed to analyze weather data. ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// Crop health analysis
router.post('/crop-health', async (req: Request, res: Response) => {
  try {
    const { cropType, description, imageBase64, userId } = req.body;

    if (!cropType || !description) {
      return res.status(400).json({ error: 'Crop type and description are required' });
    }

    const analysis = await llmService.analyzeCropHealth(
      cropType,
      description,
      imageBase64,
      userId
    );

    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing crop health:', error);
    res.status(500).json({
      error: `Failed to analyze crop health. ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// Watering recommendations
router.post('/watering-recommendations', async (req: Request, res: Response) => {
  try {
    const { cropType, location, weatherData, userId } = req.body;

    if (!cropType || !location || !weatherData) {
      return res.status(400).json({
        error: 'Crop type, location, and weather data are required',
      });
    }

    const recommendations = await llmService.generateWateringRecommendations(
      cropType,
      location,
      weatherData,
      userId
    );

    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating watering recommendations:', error);
    res.status(500).json({
      error: `Failed to generate watering recommendations. ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// Fertilization plan
router.post('/fertilization', async (req: Request, res: Response) => {
  try {
    const { cropType, soilData, weatherData, userId } = req.body;

    if (!cropType || !soilData || !weatherData) {
      return res.status(400).json({
        error: 'Crop type, soil data, and weather data are required',
      });
    }

    const plan = await llmService.generateFertilizationPlan(
      cropType,
      soilData,
      weatherData,
      userId
    );

    res.json({ plan });
  } catch (error) {
    console.error('Error generating fertilization plan:', error);
    res.status(500).json({
      error: `Failed to generate fertilization plan. ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// Weather alerts
router.post('/weather-alerts', async (req: Request, res: Response) => {
  try {
    const { location, weatherData, userId } = req.body;

    if (!location || !weatherData) {
      return res.status(400).json({ error: 'Location and weather data are required' });
    }

    const alerts = await llmService.checkForWeatherAlerts(
      location,
      weatherData,
      userId
    );

    res.json({ alerts });
  } catch (error) {
    console.error('Error checking weather alerts:', error);
    res.status(500).json({
      error: `Failed to check weather alerts. ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// Crop comparison
router.post('/crop-comparison', async (req: Request, res: Response) => {
  try {
    const { crops, userId } = req.body;

    if (!crops || !Array.isArray(crops) || crops.length === 0) {
      return res.status(400).json({ error: 'At least one crop is required' });
    }

    const comparison = await llmService.compareCrops(crops, userId);

    res.json({ comparison });
  } catch (error) {
    console.error('Error comparing crops:', error);
    res.status(500).json({
      error: `Failed to compare crops. ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// Crop encyclopedia
router.post('/crop-encyclopedia', async (req: Request, res: Response) => {
  try {
    const { cropName, userId } = req.body;

    if (!cropName) {
      return res.status(400).json({ error: 'Crop name is required' });
    }

    const info = await llmService.getCropEncyclopediaInfo(cropName, userId);

    res.json({ info });
  } catch (error) {
    console.error('Error getting crop encyclopedia:', error);
    res.status(500).json({
      error: `Failed to get crop encyclopedia. ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

export default router;
