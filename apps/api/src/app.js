import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { query } from './db.js';
import { authRoutes } from './routes/auth-routes.js';
import { auditRoutes } from './routes/audit-routes.js';
import { roleRoutes } from './routes/role-routes.js';
import { userRoutes } from './routes/user-routes.js';

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: options.logger ?? config.nodeEnv !== 'test',
    trustProxy: true,
  });

  app.decorateRequest('user', null);

  await app.register(helmet, {
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
  });
  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.get('/api/health', async () => {
    await query('SELECT 1');
    return { status: 'ok', service: 'legaldesk-api' };
  });

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(auditRoutes, { prefix: '/api/v1/audit' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(roleRoutes, { prefix: '/api/v1/roles' });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ message: 'Recurso no encontrado.' });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (error.code === '23505') {
      return reply.code(409).send({ message: 'Ya existe un registro con esos datos.' });
    }
    if (error.code === '23503') {
      return reply.code(400).send({ message: 'La información relacionada no es válida.' });
    }
    if (error.validation) {
      return reply.code(400).send({ message: 'Revisa los datos enviados.', details: error.validation });
    }
    return reply
      .code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500)
      .send({ message: error.statusCode && error.statusCode < 500 ? error.message : 'Ocurrió un error interno.' });
  });

  return app;
}
