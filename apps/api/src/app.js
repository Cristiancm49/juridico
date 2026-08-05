import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { query } from './db.js';
import { authRoutes } from './routes/auth-routes.js';
import { actionRoutes } from './routes/action-routes.js';
import { auditRoutes } from './routes/audit-routes.js';
import { catalogRoutes } from './routes/catalog-routes.js';
import { caseRoutes } from './routes/case-routes.js';
import { documentRoutes } from './routes/document-routes.js';
import { notificationRoutes } from './routes/notification-routes.js';
import { peopleRoutes } from './routes/people-routes.js';
import { requestRoutes } from './routes/request-routes.js';
import { roleRoutes } from './routes/role-routes.js';
import { taskRoutes } from './routes/task-routes.js';
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
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: config.documentMaxBytes,
      fields: 3,
      fieldSize: 2000,
      parts: 4,
    },
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.get('/api/health', async () => {
    await query('SELECT 1');
    return { status: 'ok', service: 'legaldesk-api' };
  });

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
    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({
        message: `El archivo supera el tamaño máximo permitido de ${Math.round(config.documentMaxBytes / (1024 * 1024))} MB.`,
      });
    }
    if (error.validation) {
      return reply.code(400).send({ message: 'Revisa los datos enviados.', details: error.validation });
    }
    return reply
      .code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500)
      .send({ message: error.statusCode && error.statusCode < 500 ? error.message : 'Ocurrió un error interno.' });
  });

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(actionRoutes, { prefix: '/api/v1/cases' });
  await app.register(auditRoutes, { prefix: '/api/v1/audit' });
  await app.register(catalogRoutes, { prefix: '/api/v1/catalogs' });
  await app.register(caseRoutes, { prefix: '/api/v1/cases' });
  await app.register(documentRoutes, { prefix: '/api/v1/cases' });
  await app.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await app.register(peopleRoutes, { prefix: '/api/v1/people' });
  await app.register(requestRoutes, { prefix: '/api/v1/requests' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(roleRoutes, { prefix: '/api/v1/roles' });
  await app.register(taskRoutes, { prefix: '/api/v1/tasks' });

  return app;
}
