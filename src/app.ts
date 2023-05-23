"use strict";

import { join } from 'path';
import AutoLoad, {AutoloadPluginOptions} from '@fastify/autoload';
import { FastifyPluginAsync } from 'fastify';
import FastifyWebSocket from "@fastify/websocket";
import FastifyRedis from "@fastify/redis"
import { Message } from './interfaces/unity/Message';
import { intervalTimer } from './utils/common';

export type AppOptions = {
} & Partial<AutoloadPluginOptions>;


const options: AppOptions = {
}

const TICK_INTERVAL = 25; // milliseconds
let ticks = 0; 
let tickInterval:Function; 

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
    },
  }).addHook("onRegister", () => {
    if (!!tickInterval) return; 
    tickInterval = intervalTimer(() => {
      if (fastify.websocketServer.clients.size === 0) {
        ticks = 0;
        return;  
      }
  
      ticks++; 
  
      fastify.websocketServer.clients.forEach(connection => {
        const messages:object[] = []

        if (connection.batchTransforms.length) messages.push({
          type: Message.Type.BATCH_TRANSFORM,
          body: {
            ticks,
            transformations: connection.batchTransforms
          }
        })

        if (ticks % 200 == 0) messages.push({
          type: Message.Type.SYNC_TICK,
          body: {
            ticks
          }
        })

        if (!!messages.length) connection.send(JSON.stringify({
          messages
        })); 
    
        connection.batchTransforms = [];
      });
    }, TICK_INTERVAL);
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
