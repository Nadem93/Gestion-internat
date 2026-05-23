import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { authRouter } from './routes/auth';
import { residentsRouter } from './routes/residents';
import { journalRouter } from './routes/journal';
import { planningRouter } from './routes/planning';
import { presencesRouter } from './routes/presences';
import { adminRouter } from './routes/admin';
import { establishmentsRouter } from './routes/establishments';

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to known origins
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' },
});
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/establishments', establishmentsRouter);
app.use('/api/residents', residentsRouter);
app.use('/api/journal', journalRouter);
app.use('/api/planning', planningRouter);
app.use('/api/presences', presencesRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  const msg = `Gestio-ESMS API running on http://localhost:${config.port}`;
  console.log(msg);
});
