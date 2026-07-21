import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { seedSampleData } from '../services/database';

const router = Router();

router.post('/seed', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.uid) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const userId = req.uid!;
    
    const success = await seedSampleData(userId);
    if (success) {
      return res.json({ success: true, message: 'Sample data loaded successfully' });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to load sample data' });
    }
  } catch (err: any) {
    console.error('Error in /seed:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
