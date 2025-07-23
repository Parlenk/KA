import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, config.jwt.secret);
  const refreshToken = jwt.sign({ userId: payload.userId }, config.jwt.secret);

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, config.jwt.secret) as { userId: string };
};