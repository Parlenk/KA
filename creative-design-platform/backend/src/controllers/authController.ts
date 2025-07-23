import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { DatabaseConnection } from '../config/database';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../validators/auth';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      const { email, password, firstName, lastName } = value;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(409).json({
          error: true,
          message: 'User with this email already exists'
        });
        return;
      }

      const user = new User({
        email,
        password,
        firstName,
        lastName
      });

      await user.save();

      const tokens = generateTokens({
        userId: (user._id as any).toString(),
        email: user.email,
        role: user.role
      });

      const redis = DatabaseConnection.getRedis();
      if (redis) {
        await redis.setex(
          `refresh_token:${user._id}`,
          30 * 24 * 60 * 60,
          tokens.refreshToken
        );
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            subscription: user.subscription,
            preferences: user.preferences
          },
          tokens
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: true,
        message: 'Internal server error during registration'
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      const { email, password } = value;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        res.status(401).json({
          error: true,
          message: 'Invalid email or password'
        });
        return;
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({
          error: true,
          message: 'Invalid email or password'
        });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();

      const tokens = generateTokens({
        userId: (user._id as any).toString(),
        email: user.email,
        role: user.role
      });

      const redis = DatabaseConnection.getRedis();
      if (redis) {
        await redis.setex(
          `refresh_token:${user._id}`,
          30 * 24 * 60 * 60,
          tokens.refreshToken
        );
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            subscription: user.subscription,
            preferences: user.preferences,
            lastLoginAt: user.lastLoginAt
          },
          tokens
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: true,
        message: 'Internal server error during login'
      });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      const { refreshToken } = value;

      const decoded = verifyRefreshToken(refreshToken);
      const redis = DatabaseConnection.getRedis();

      if (redis) {
        const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
        if (storedToken !== refreshToken) {
          res.status(401).json({
            error: true,
            message: 'Invalid refresh token'
          });
          return;
        }
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401).json({
          error: true,
          message: 'User not found'
        });
        return;
      }

      const tokens = generateTokens({
        userId: (user._id as any).toString(),
        email: user.email,
        role: user.role
      });

      if (redis) {
        await redis.setex(
          `refresh_token:${user._id}`,
          30 * 24 * 60 * 60,
          tokens.refreshToken
        );
      }

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        error: true,
        message: 'Invalid refresh token'
      });
    }
  }

  static async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: true,
          message: 'Authentication required'
        });
        return;
      }

      const redis = DatabaseConnection.getRedis();
      if (redis) {
        await redis.del(`refresh_token:${req.user._id}`);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: true,
        message: 'Internal server error during logout'
      });
    }
  }

  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: true,
          message: 'Authentication required'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user._id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.user.role,
            isEmailVerified: req.user.isEmailVerified,
            avatar: req.user.avatar,
            subscription: req.user.subscription,
            usage: req.user.usage,
            preferences: req.user.preferences,
            lastLoginAt: req.user.lastLoginAt,
            createdAt: req.user.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: true,
        message: 'Internal server error'
      });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: true,
          message: 'Authentication required'
        });
        return;
      }

      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      const updateData = { ...value };
      if (value.preferences) {
        updateData.preferences = {
          ...req.user.preferences,
          ...value.preferences
        };
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser!._id,
            email: updatedUser!.email,
            firstName: updatedUser!.firstName,
            lastName: updatedUser!.lastName,
            role: updatedUser!.role,
            preferences: updatedUser!.preferences
          }
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: true,
        message: 'Internal server error'
      });
    }
  }

  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: true,
          message: 'Authentication required'
        });
        return;
      }

      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      const { currentPassword, newPassword } = value;

      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        res.status(404).json({
          error: true,
          message: 'User not found'
        });
        return;
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          error: true,
          message: 'Current password is incorrect'
        });
        return;
      }

      user.password = newPassword;
      await user.save();

      const redis = DatabaseConnection.getRedis();
      if (redis) {
        await redis.del(`refresh_token:${user._id}`);
      }

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again.'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: true,
        message: 'Internal server error'
      });
    }
  }
}