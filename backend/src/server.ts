import { createApp } from './app';
import { connectDB } from './config/db';
import { config } from './config/env';

async function bootstrap() {
  try {
    console.log('[Iniciando] Conectando ao banco de dados MongoDB...');
    await connectDB();

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(` Servidor de Reservas de Laboratórios iniciado com sucesso!`);
      console.log(` Porta: ${config.port}`);
      console.log(` Ambiente: ${config.nodeEnv}`);
      console.log(` Timezone: ${config.timezone}`);
      console.log(` API URL: http://localhost:${config.port}/api`);
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
  } catch (error) {
    console.error('[ERRO CRÍTICO AO INICIAR SERVIDOR]:', error);
    process.exit(1);
  }
}

bootstrap();
