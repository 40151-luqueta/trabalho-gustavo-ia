import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { runSeed } from '../src/seed/seed';
import { connectDB } from '../src/config/db';

import { config } from '../src/config/env';

let mongoServer: MongoMemoryServer;

export async function setupTestDB(): Promise<void> {
  // Configurações para testes em memória
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_key_123456789';
  process.env.ADMIN_INITIAL_EMAIL = 'admin@escola.com';
  process.env.ADMIN_INITIAL_PASSWORD = 'AdminSeguro@2027';
  config.adminInitial.email = 'admin@escola.com';
  config.adminInitial.senha = 'AdminSeguro@2027';

  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  await connectDB(uri);

  // Executar seed inicial para ter laboratórios, configurações e admin prontos
  await runSeed({ silent: true });
}

export async function teardownTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null as any;
  }
}

export async function clearCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    // Manter labs e settings caso queira, ou limpar apenas usuários e reservas
    if (key === 'reservations' || key === 'reservationrules') {
      await collection.deleteMany({});
    }
  }
}
