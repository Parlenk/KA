import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

router.use('/auth', authRoutes);

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Creative Design Platform API v1.0.0',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      docs: '/api/v1/docs'
    },
    status: 'operational'
  });
});

export default router;