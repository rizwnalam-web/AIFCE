import { Router, Request, Response, RequestHandler } from 'express';
import prisma from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create a new report
router.post('/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;
    const { title, reportType, content, filename } = req.body;

    const report = await prisma.report.create({
      data: {
        id: uuidv4(),
        userId,
        title,
        reportType,
        content,
        filename,
      },
    });

    res.json(report);
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
}) as RequestHandler<{ userId: string }>);

// Get all reports for a user
router.get('/:userId', (async (req, res) => {
  try {
    const userId = req.params.userId;

    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    console.error('Error getting reports:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
}) as RequestHandler<{ userId: string }>);

// Get a specific report
router.get('/:userId/:reportId', (async (req, res) => {
  try {
    const { userId, reportId } = req.params;

    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error getting report:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
}) as RequestHandler<{ userId: string; reportId: string }>);

// Update a report
router.put('/:userId/:reportId', (async (req, res) => {
  try {
    const { userId, reportId } = req.params;
    const { title, content, filename } = req.body;

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(filename !== undefined && { filename }),
      },
    });

    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
}) as RequestHandler<{ userId: string; reportId: string }>);

// Delete a report
router.delete('/:userId/:reportId', (async (req, res) => {
  try {
    const { userId, reportId } = req.params;

    // Ensure the report belongs to the user before deleting
    const report = await prisma.report.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }

    await prisma.report.delete({
      where: { id: reportId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
}) as RequestHandler<{ userId: string; reportId: string }>);

export default router;