import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/:userId', async (req: Request<{ userId: string }, any, { title: string; reportType: string; content: string; filename?: string }>, res: Response) => {
  try {
    const userId = req.params.userId;
    const { title, reportType, content, filename } = req.body;

    if (!title || !content || !reportType) {
      return res.status(400).json({ error: 'title, reportType, and content are required.' });
    }

    const report = await prisma.report.create({
      data: {
        id: uuidv4(),
        userId,
        title,
        reportType,
        filename,
        content,
      },
    });

    res.json(report);
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

router.get('/:userId', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/:userId/:reportId', async (req: Request<{ userId: string; reportId: string }>, res: Response) => {
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
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

export default router;
