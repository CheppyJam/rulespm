import { FromSchema } from "json-schema-to-ts";
import { FastifyInstance } from "fastify";
import { stringify } from "querystring";
import jwt from "jsonwebtoken";
import axios from "axios";
import { CookieSerializeOptions } from '@fastify/cookie';

const cookieSettings: CookieSerializeOptions = {
  httpOnly: true,
  path: '/',
  sameSite: 'strict',
  maxAge: 2629800, //1 month
  secure: process.env.NODE_ENV === 'production'
};

const schema = {
  body: {
    type: "object",
    required: ["code"],
    properties: {
      code: { type: "string" },
    },
  },
} as const;

export default async (server: FastifyInstance) =>
  server.post<{ Body: FromSchema<typeof schema.body> }>(
    "/discord",
    { schema },
    async (req, reply) => {
      const { data } = await axios
        .post(
          "https://discord.com/api/oauth2/token",
          stringify({
            /* eslint-disable camelcase */
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: `${process.env.FRONTEND_ORIGIN}/`,
            code: req.body.code,
            /* eslint-enable */
          }),
          {
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`,
                "utf-8"
              ).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        )
        .catch(() => reply.code(403).send("Код устарел"));
      if (!data) return reply.send(new Error());
      // eslint-disable-next-line one-var
      const {
        data: { discordId },
      } = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `${data.token_type} ${data.access_token}` },
      });
      if (!discordId) return reply.send(new Error());

      const spwUser = await server.spw.getUser(discordId);
      if (!spwUser) return reply.code(404).send("Проходка не найдена");
      // eslint-disable-next-line one-var
      const user = await server.db.user.upsert({
        where: { discordId },
        create: {
          discordId,
          minecraftUUID: spwUser.id,
          username: spwUser.username,
        },
        update: {
          minecraftUUID: spwUser.id,
          username: spwUser.username,
        },
      });
      if (!user)
        return reply.code(400).send(new Error("Пользователь не найден"));

      const token = jwt.sign(
        { id: user.id, isAdmin: user.isAdmin },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '30d' }
      );

      return reply.setCookie('smile', token, cookieSettings).redirect(process.env.FRONTEND_ORIGIN);
    }
  );
