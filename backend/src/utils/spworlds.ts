import { FastifyReply, FastifyRequest } from 'fastify';
import { createHmac } from 'crypto';
import axios from 'axios';

export class SPWorlds {
  private token: string = '';
  private verifyToken: string = '';
  private url: string = 'https://spworlds.ru/api/public/';

  constructor(token: string, cardId: string) {
    this.token = Buffer.from(`${cardId}:${token}`, 'binary').toString('base64');
    this.verifyToken = token;
  }

  private method = async (method: string, parmas?: any) => {
    const { data } = await axios.get(this.url + method, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });

    return data;
  };

  public getBalance = async () => {
    return (await this.method('card').then(data => {
      return data;
    })) as Promise<{ balance: number }>;
  };

  public getUser = async (id: number | string) => {
    const spwUser: any = await this.method(`users/${id}`);
    if (!spwUser) return undefined;
    const { data } = await axios.get(
      `https://api.mojang.com/users/profiles/minecraft/${spwUser.username}`
    );
    return {
      id: data.id,
      username: data.name
    };
  };

  public payment = async (
    amount: number,
    redirectUrl: string,
    webhookUrl: string,
    data = 'Test'
  ) => {
    const response = await axios.post(
      this.url + 'payment',
      {
        amount,
        redirectUrl,
        webhookUrl,
        data
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    );
    return response.data as { url: string };
  };

  public verify = (req: FastifyRequest, reply: FastifyReply) => {
    let hash: string = '';
    if (!req.headers['x-body-hash']) {
      return reply.sendError('Не найден хэш');
    } else {
      hash = req.headers['x-body-hash'] as string;
    }

    return (
      createHmac('sha256', this.verifyToken).update(JSON.stringify(req.body)).digest('base64') ===
      hash
    );
  };
}