import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { verify } from 'jsonwebtoken';
import { AuthUser } from './types';

export const getAuthUser = async function (this: FastifyInstance, discordId: string): Promise<AuthUser> {
    return (await this.db.user.findUnique({
      where: {
        discordId
      },
      select: {
        isAdmin: true,
        discordId: true
      }
    })) as AuthUser;
  },
  getAccessToken = function (this: FastifyRequest) {
    return { token: this.cookies.smile };
  },
  checkAuth = (roles: string[] = []) =>
    // eslint-disable-next-line complexity
    async function (this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
      const accessToken = req.getAccessToken();
      if (!accessToken.token) return reply.code(403).send(new Error('Ошибка авторизации'));
      try {
        const token = verify(accessToken.token, process.env.JWT_ACCESS_SECRET) as {
          discordId: string;
          isAdmin: string;
        };
        req.user = await this.getAuthUser(token.discordId);

        if (!(roles.includes('*') || req.user.isAdmin)) {
          return reply.code(403).send(new Error('Нет прав'));
        }
      } catch {
        return reply.code(403).send(new Error('Ошибка авторизации'));
      }
    };