import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);

router.post('/login', AuthController.login);

router.post('/refresh-token', AuthController.refreshToken);

router.post('/logout', authenticateToken, AuthController.logout);

router.get('/profile', authenticateToken, AuthController.getProfile);

router.put('/profile', authenticateToken, AuthController.updateProfile);

router.put('/change-password', authenticateToken, AuthController.changePassword);

export default router;