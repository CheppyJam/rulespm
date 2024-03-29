import { checkAuth, getAccessToken, getAuthUser } from './utils/auth';
import { PrismaClient } from '@prisma/client'
import fastify, { FastifyReply, onRequestHookHandler } from 'fastify';
import ajvErrors from 'ajv-errors';
import fastifyAutoload from '@fastify/autoload';
import path from 'path';
import { SPWorlds } from './utils/spworlds';
import { AuthUser } from './utils/types';

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
      SPWORLDS_TOKEN: string;
      SPWORLDS_CARD_ID: string;
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

export const spw = new SPWorlds(
  process.env.SPWORLDS_TOKEN,
  process.env.SPWORLDS_CARD_ID
)

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
    spw: SPWorlds;
    getAuthUser: (id: string) => Promise<AuthUser>;
    auth: (roles?: string[]) => onRequestHookHandler;
  }
  interface FastifyRequest {
    user: AuthUser;
    getAccessToken: () => { token: string | undefined };
  }
  interface FastifyReply {
    sendError: (error: any, code?: number, explanation?: string) => void;
  }
}

fastify({
  ajv: { plugins: [ajvErrors], customOptions: { allErrors: true } },
  logger: true,
  trustProxy: true
})
.decorateReply(
  'sendError',
  function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any,
    code = 500,
    explanation = 'Техническая ошибка.'
  ) {
    this.log.error(error);
    this.code(code).send(new Error(explanation));
  }
)
.decorate('db', db)
.decorate('spw', spw)
.decorateRequest('user', null)
.decorateRequest('getAccessToken', getAccessToken)
.decorate('getAuthUser', getAuthUser)
.decorate<(roles?: string[]) => onRequestHookHandler>('auth', checkAuth)
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