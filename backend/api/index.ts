import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';
import { runSeed } from '../src/seed/seed';
import { Request, Response } from 'express';

const app = createApp();
let seedExecuted = false;

export default async function handler(req: Request, res: Response) {
  await connectDB();
  if (!seedExecuted) {
    try {
      await runSeed({ silent: true });
      seedExecuted = true;
    } catch (err) {
      console.error('[Deploy Seed Error]:', err);
    }
  }
  return app(req, res);
}

