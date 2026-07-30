import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { seedAdmin } from './config/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
const frontendUrl = process.env.FRONTEND_URL 
  ? (process.env.FRONTEND_URL.startsWith('http') ? process.env.FRONTEND_URL : `https://${process.env.FRONTEND_URL}`)
  : '*';

app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import previousCompaniesRoutes from './routes/previousCompanies';
import adminRoutes from './routes/admin';
import tpoRoutes from './routes/tpo';

// Connect DB
connectDB().then(() => {
  // Seed initial data
  seedAdmin();
});

// Initialize Schedulers
import { initSchedulers } from './scheduler/job-scheduler';
initSchedulers();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/previous-companies', previousCompaniesRoutes);
app.use('/api/tpo', tpoRoutes);
app.use('/api', apiRoutes);

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
