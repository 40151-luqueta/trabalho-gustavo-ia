"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Tentar carregar .env de múltiplos caminhos possíveis (raiz do projeto ou pasta backend)
const possibleEnvPaths = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(process.cwd(), '../.env'),
    path_1.default.resolve(__dirname, '../../.env'),
    path_1.default.resolve(__dirname, '../../../.env')
];
for (const envPath of possibleEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
    }
}
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/laboratorios',
    jwtSecret: process.env.JWT_SECRET || 'secret_key_development_only_lab_2027',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
    adminInitial: {
        nome: process.env.ADMIN_INITIAL_NAME || 'Administrador do Sistema',
        email: process.env.ADMIN_INITIAL_EMAIL || 'admin@escola.com',
        senha: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSeguro@2027'
    }
};
