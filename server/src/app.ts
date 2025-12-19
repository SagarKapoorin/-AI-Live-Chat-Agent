import express from 'express';
import { errorHandler } from './middlewares/errorHandler.js';
import { chatRouter } from './routes/chatRoutes.js';
import { env } from './config/env.js';
import { JSON_BODY_LIMIT } from './constants/index.js';

export const app = express();

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
app.use('/api', chatRouter);
app.use(errorHandler);

const port = Number(env.port) || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
