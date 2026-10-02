import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Tentar carregar .env de múltiplos caminhos possíveis (raiz do projeto ou pasta backend)
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/laboratorios',
  jwtSecret: process.env.JWT_SECRET || 'secret_key_development_only_lab_2027',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
  adminInitial: {
    nome: process.env.ADMIN_INITIAL_NAME || 'Administrador Raphael Di Santo',
    email: process.env.ADMIN_INITIAL_EMAIL || '40151@raphaeldisanto.com.br',
    senha: process.env.ADMIN_INITIAL_PASSWORD || '40151@raphaeldisanto.com.br'
  }
};
