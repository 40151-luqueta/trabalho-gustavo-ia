"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
// Importação das Rotas
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const labRoutes_1 = __importDefault(require("./routes/labRoutes"));
const equipmentRoutes_1 = __importDefault(require("./routes/equipmentRoutes"));
const ruleRoutes_1 = __importDefault(require("./routes/ruleRoutes"));
const reservationRoutes_1 = __importDefault(require("./routes/reservationRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
function createApp() {
    const app = (0, express_1.default)();
    // Middlewares de Segurança e Parsing
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false // Permite carregar scripts e estilos do frontend na mesma origem ou CDN
    }));
    app.use((0, cors_1.default)({
        origin: env_1.config.corsOrigin === '*' ? true : env_1.config.corsOrigin,
        credentials: true
    }));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Endpoint de Saúde
    app.get('/api/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            timezone: env_1.config.timezone,
            uptime: process.uptime()
        });
    });
    // Montagem das Rotas da API
    app.use('/api/auth', authRoutes_1.default);
    app.use('/api/users', userRoutes_1.default);
    app.use('/api/labs', labRoutes_1.default);
    app.use('/api/equipments', equipmentRoutes_1.default);
    app.use('/api/rules', ruleRoutes_1.default);
    app.use('/api/reservations', reservationRoutes_1.default);
    app.use('/api/settings', settingsRoutes_1.default);
    app.use('/api/public', publicRoutes_1.default);
    // Servir arquivos estáticos do frontend caso estejam sendo servidos pela mesma instância
    const frontendPath = path_1.default.resolve(__dirname, '../../frontend');
    app.use(express_1.default.static(frontendPath));
    // Tratamento Global de Erros
    app.use(errorHandler_1.errorHandler);
    return app;
}
