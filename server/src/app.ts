import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import hpp from 'hpp';
import { errorHandler } from './middlewares/errorHandler.js';
import { chatRouter } from './routes/chatRoutes.js';
import { env } from './config/env.js';
import { JSON_BODY_LIMIT } from './constants/index.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

dotenv.config();

export const app = express();

app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(hpp());
app.use(morgan('common'));
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
app.use(rateLimiter);
app.use('/api', chatRouter);
app.use(errorHandler);

const port = Number(env.port) || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
