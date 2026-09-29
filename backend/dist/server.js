"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
async function bootstrap() {
    try {
        console.log('[Iniciando] Conectando ao banco de dados MongoDB...');
        await (0, db_1.connectDB)();
        const app = (0, app_1.createApp)();
        const server = app.listen(env_1.config.port, () => {
            console.log(`=======================================================`);
            console.log(` Servidor de Reservas de Laboratórios iniciado com sucesso!`);
            console.log(` Porta: ${env_1.config.port}`);
            console.log(` Ambiente: ${env_1.config.nodeEnv}`);
            console.log(` Timezone: ${env_1.config.timezone}`);
            console.log(` API URL: http://localhost:${env_1.config.port}/api`);
            console.log(`=======================================================`);
        });
        const shutdown = async () => {
            console.log('\n[Encerrando] Fechando conexões com segurança...');
            server.close(() => {
                console.log('[Encerrado] Servidor finalizado.');
                process.exit(0);
            });
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (error) {
        console.error('[ERRO CRÍTICO AO INICIAR SERVIDOR]:', error);
        process.exit(1);
    }
}
bootstrap();
