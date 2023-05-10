"use strict";

import { join } from 'path';
import AutoLoad, {AutoloadPluginOptions} from '@fastify/autoload';
import { FastifyPluginAsync } from 'fastify';
import FastifyWebSocket from "@fastify/websocket";
import FastifyRedis from "@fastify/redis"

export type AppOptions = {
} & Partial<AutoloadPluginOptions>;


const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (
    fastify,
    opts
): Promise<void> => {
  fastify.register(FastifyRedis, { 
    host: process.env.REDIS_HOST!, 
    password: process.env.REDIS_PASSWORD!,
    port: parseInt(process.env.REDIS_PORT!), 
    username: process.env.REDIS_USER,
    family: 4,
  })

  fastify.register(FastifyWebSocket, {
    options: { 
      maxPayload: 1048576,
    }
  });

  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  })
};

export default app;
export { app, options }
