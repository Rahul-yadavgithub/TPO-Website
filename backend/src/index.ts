import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { seedAdmin } from './config/seed';

import { createServer } from 'http';
import { initSocketServer } from './socket/socketServer';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initSocketServer(httpServer);

// Middleware
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cookieParser());
const frontendUrl = process.env.FRONTEND_URL 
  ? (process.env.FRONTEND_URL.startsWith('http') ? process.env.FRONTEND_URL : `https://${process.env.FRONTEND_URL}`)
  : '*';

const externalPlatformUrl = process.env.EXTERNAL_PLATFORM_URL || '';

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like server-to-server webhooks or mobile apps)
    if (!origin) return callback(null, true);
    
    // Allow frontend URL
    if (frontendUrl === '*' || origin === frontendUrl) {
      return callback(null, true);
    }
    
    // Allow External Platform URL (for webhook testing tools that use browsers)
    if (externalPlatformUrl && origin === externalPlatformUrl) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import previousCompaniesRoutes from './routes/previousCompanies';
import adminRoutes from './routes/admin';
import tpoRoutes from './routes/tpo';
import transferRequestsRoutes from './routes/transferRequests';
import webhookRoutes from './routes/webhooks';
import studentRecordsRoutes from './routes/studentRecords';

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
app.use('/api/transfer-requests', transferRequestsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/student-records', studentRecordsRoutes);
app.use('/api', apiRoutes);

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
