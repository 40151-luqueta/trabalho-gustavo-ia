import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Importação das Rotas
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import labRoutes from './routes/labRoutes';
import equipmentRoutes from './routes/equipmentRoutes';
import ruleRoutes from './routes/ruleRoutes';
import reservationRoutes from './routes/reservationRoutes';
import settingsRoutes from './routes/settingsRoutes';
import publicRoutes from './routes/publicRoutes';

export function createApp(): Application {
  const app = express();

  // Middlewares de Segurança e Parsing
  app.use(
    helmet({
      contentSecurityPolicy: false // Permite carregar scripts e estilos do frontend na mesma origem ou CDN
    })
  );

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin,
      credentials: true
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Endpoint de Saúde
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      timezone: config.timezone,
      uptime: process.uptime()
    });
  });

  // Montagem das Rotas da API
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/labs', labRoutes);
  app.use('/api/equipments', equipmentRoutes);
  app.use('/api/rules', ruleRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/public', publicRoutes);

  // Servir arquivos estáticos do frontend caso estejam sendo servidos pela mesma instância
  const frontendPath = path.resolve(__dirname, '../../frontend');
  app.use(express.static(frontendPath));

  // Tratamento Global de Erros
  app.use(errorHandler);

  return app;
}
