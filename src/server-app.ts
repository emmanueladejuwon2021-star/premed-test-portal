import fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { connectDB } from './db';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import simulationRoutes from './routes/simulation';
import adminRoutes from './routes/admin';
import developerRoutes from './routes/developer';
import chatRoutes from './routes/chat';

const app = fastify({
  bodyLimit: 12 * 1024 * 1024 // 12MB limit for base64 image uploads in chat and registration
});

app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

app.register(cors, { 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

app.addHook('preHandler', async (request, reply) => {
  if (request.method === 'OPTIONS') return;
  console.log(`[Fastify] Request: ${request.method} ${request.url}`);
  try {
    await connectDB();
  } catch (err) {
    return reply.status(500).send({ error: 'Database connection failed. Please check MONGODB_URI configuration.' });
  }
});

app.register(authRoutes, { prefix: '/api' });
app.register(courseRoutes, { prefix: '/api' });
app.register(simulationRoutes, { prefix: '/api' });
app.register(adminRoutes, { prefix: '/api' });
app.register(developerRoutes, { prefix: '/api' });
app.register(chatRoutes, { prefix: '/api' });

app.post('/api/test-post', async (request, reply) => reply.send({ success: true }));

app.get('/api/health', async (request, reply) => reply.send({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/db-test', async (request, reply) => reply.send({ status: 'Connected via Mongoose', database: 'MongoDB' }));
app.get('/api/admin/init-db', async (request, reply) => reply.send({ success: true, message: 'Databases are NoSQL (MongoDB)' }));

app.all('/api/*', async (request, reply) => {
  reply.status(404).send({ error: 'API Endpoint not found.' });
});

// Note: setNotFoundHandler or setErrorHandler can be used here if needed
app.setErrorHandler((error, request, reply) => {
  console.error('[Global API Error]', error);
  reply.status(500).send({ error: (error as any).message || 'Internal Server Error' });
});

export default app;
