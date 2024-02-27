import { PrismaClient } from '@prisma/client'
import fastify, { FastifyReply, onRequestHookHandler } from 'fastify';
import ajvErrors from 'ajv-errors';
import fastifyAutoload from '@fastify/autoload';
import path from 'path';


declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'production' | 'development';
      BACKEND_PORT?: string;
      FRONTEND_ORIGIN: string;
      JWT_ACCESS_SECRET: string;
      DISCORD_CLIENT_ID: string;
      DISCORD_CLIENT_SECRET: string;
      DISCORD_BOT_TOKEN: string;
    }
  }
}

export const db = new PrismaClient({
  ...(process.env.NODE_ENV === 'development'
    ? {
        log: ['query', 'info', 'warn', 'error']
      }
    : {})
});

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient
  }
}

fastify({
  ajv: { plugins: [ajvErrors], customOptions: { allErrors: true } },
  logger: true,
  trustProxy: true
})
.decorate('db', db)
.register(fastifyAutoload, {
  dir: path.join(__dirname, 'routes'),
  routeParams: true,
  autoHooks: true,
  cascadeHooks: true,
  options: { prefix: '/api' }
})
.listen({
  port: Number(process.env.BACKEND_PORT) || 8080,
  host: '0.0.0.0'
})
.catch(console.error);