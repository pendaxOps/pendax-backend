import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { offrampRoutes } from './routes/offramp';
import { ServiceManager } from './services/ServiceManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use('/api/offramp', offrampRoutes);
app.use('/api/webhooks', offrampRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pendax Backend API is running' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});


app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

async function startServer() {
  try {
    await ServiceManager.getInstance().initialize();
    console.log('✅ Services initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Pendax Backend API running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
