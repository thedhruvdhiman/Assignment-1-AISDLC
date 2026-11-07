import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ status: 'unavailable' });
    return;
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
