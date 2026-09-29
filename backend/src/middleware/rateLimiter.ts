import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite razoável para desenvolvimento/testes/produção
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de autenticação. Por favor, tente novamente após 15 minutos.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
