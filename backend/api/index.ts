import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';
import { Request, Response } from 'express';

const app = createApp();

export default async function handler(req: Request, res: Response) {
  await connectDB();
  return app(req, res);
}
