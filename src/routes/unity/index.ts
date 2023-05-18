import { FastifyPluginAsync } from "fastify"
import { ROOM_IDENTIFIER, generateRoomKey } from "../../utils/redis";
import { WebSocket as DefaultWebSocket } from "ws";
import { Message } from "../../interfaces/unity/Message";

interface IClientSocket {
  userId: string; 
  roomKey: string; 
  username?: string; 
  isAlive: boolean; 
  lastPost: number; 
  properties: Map<string, string>;
  batchTransforms: Message.BatchTransform[]
}

declare module "ws" {
  interface WebSocket extends IClientSocket {}
}

declare module "@fastify/websocket" {
  export interface WebSocket extends DefaultWebSocket, IClientSocket {}
}

const unity: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/room/all", async function (req, res) {
    const { redis } = fastify;

    const keys = [];
    let cursor = '0';
   
    do {
      const result = await redis.scan(cursor, 'MATCH', `${ROOM_IDENTIFIER}*`);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
  
    res
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ rooms: keys.map(key => Buffer.from(key.substring(ROOM_IDENTIFIER.length + 1), 'base64').toString() )});
  });

  fastify.get("/room/clients", async (req, res) => {
      const { redis } = fastify;

      const users:object[] = [];

      const room = (req.query as any).room; 
      const roomKey = generateRoomKey(room.toString());
      const userIds = new Set(JSON.parse((await redis.hget(roomKey, "userIds")) || "[]"));
      fastify.websocketServer.clients.forEach(client => {
        if (!userIds.has(client.userId) || client.roomKey != roomKey) return; 
        users.push({ userId: client.userId, username: client.properties.get("username") })
      });

      // TODO: Potentially throw an error if user attempts to get clients for a room that doesn't exist
      res
        .code(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send({ clients: userIds ? users : [], room });
  })

  fastify.get('/', { websocket: true },  async function (connection, req) {
    const { redis } = fastify;

    const userId = (req.query as any).userId; 
    connection.socket.userId = userId;
    connection.socket.batchTransforms = [];
    connection.socket.lastPost = performance.now();
    connection.socket.properties = new Map();

    connection.socket.on('pong', () => {
      connection.socket.isAlive = true; 
    });

    const disconnectProcedure = async () => {
      if (!connection.socket.roomKey) return; 
      const [ userIds, host ] = await redis.hmget(connection.socket.roomKey, "userIds", "host");
      
      if (!userIds) return; 
      
      const currentClientIds = new Set();
      fastify.websocketServer.clients.forEach(client => {
        if (client.roomKey !== connection.socket.roomKey) return; 
        currentClientIds.add(client.userId);
        client.send(JSON.stringify({
          messages: [{
            type: Message.Type.LEFT_ROOM,
            body: { userId }
          }]
        }));
      });

      const filteredUserIds = JSON.parse(userIds).filter((client:string) => client != userId && currentClientIds.has(client));
      
      if (!filteredUserIds.length) {
        redis.del(connection.socket.roomKey); // deletes room if no users left
        return; 
      }
      // switches host to a random user that is left in the room
      if (host === userId) redis.hset(connection.socket.roomKey, "host", filteredUserIds[0]);
      redis.hset(connection.socket.roomKey, "userIds", JSON.stringify(filteredUserIds));
    };

    const performBatchTransform = setInterval(() => {
      fastify.websocketServer.clients.forEach((ws) => {
        const cycleTime = performance.now();
        if (cycleTime - ws.lastPost < 33 || !ws.batchTransforms.length) return; 

        ws.send(JSON.stringify({
          messages: [{
            type: Message.Type.BATCH_TRANSFORM,
            body: {
              transformations: ws.batchTransforms
            }
          }]
        })); 

        ws.lastPost = cycleTime; 
        ws.batchTransforms = [];
      });
    }, 33);

    // TODO: Redo Heartbeat code
    const pingPong = setInterval(() => {
      fastify.websocketServer.clients.forEach(async (ws) => {
        if (ws.isAlive === false) {
          console.log(`${ws.userId} connection broken, terminating`);
          //await disconnectProcedure();
         // ws.terminate(); // connection sometimes terminating even if connection is still alive, might be a client side problem
          clearInterval(pingPong);
          clearInterval(performBatchTransform);
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 5000);

    connection.socket.on("close", async () => {
      clearInterval(pingPong);
      clearInterval(performBatchTransform);
      console.log(`Connection closed by ${userId}`);

      await disconnectProcedure();
    });

    connection.socket.on('message', async buffer => {
      const { messages = [] } : Message.MessagesContainer = JSON.parse(buffer.toString()); 

      messages.forEach(async message => {
        if (message.type === Message.Type.CREATE_ROOM) {
          const body = message.body as Message.RoomBody;
  
          const newRoomKey = generateRoomKey(body.name); 
          const response = await redis.hset(newRoomKey, {
            userIds: JSON.stringify([ userId ]),
            host: userId
          });
          
          if (!response) return; // No New Room Created
  
          connection.socket.roomKey = newRoomKey; 
          console.log(`Host (${(connection.socket as any).userId}) joined ${newRoomKey}`);
  
          // TODO: Consider Only Sending this when client doesn't have a room key 
          fastify.websocketServer.clients.forEach(client => {
            if (client.roomKey === newRoomKey) {
              client.send(JSON.stringify({
                messages: [
                  {
                    type: Message.Type.CREATED_ROOM,
                    body: { name: body.name }
                  },
                  {
                    type: Message.Type.JOINED_ROOM,
                    body: { name: body.name, userId: connection.socket.userId, username: connection.socket.properties.get("username") }
                  }
                ]
              }));
            } else {
              client.send(JSON.stringify({
                messages: [{
                  type: Message.Type.CREATED_ROOM,
                  body: { name: body.name }
                }]
              }));
            }
          });
        }
  
        else if (message.type === Message.Type.JOIN_ROOM) {
          const body = message.body as Message.RoomBody;
          const roomKey = generateRoomKey(body.name); 
          if (connection.socket.roomKey === roomKey) return; 
  
          const currentUsers = await redis.hget(roomKey, "userIds");
          const updatedUsers = currentUsers ? 
            JSON.stringify([ ...JSON.parse(currentUsers), userId ]) : JSON.stringify([ userId ]);
          await redis.hset(roomKey, "userIds", updatedUsers);
  
          connection.socket.roomKey = roomKey; 
          console.log(`${(connection.socket as any).userId} joined ${roomKey}`);
          
          fastify.websocketServer.clients.forEach(client => {
            if (client.roomKey != roomKey) return; 
  
            client.send(JSON.stringify({
              messages: [{
                type: Message.Type.JOINED_ROOM,
                body: { name: body.name, userId, username: connection.socket.properties.get("username") }
              }]
            }));
          });
        } else if (message.type === Message.Type.BATCH_TRANSFORM) {
            const body = message.body as Message.BatchTransformationBody;
            fastify.websocketServer.clients.forEach(client => {
                if (client.roomKey !== connection.socket.roomKey || client.userId === userId) return; 
                client.batchTransforms.push(...body.transformations);
            }); 
        } else if (message.type === Message.Type.SET_USER_PROPERTY) {
          const body = message.body as Message.UserPropertyBody;
            fastify.websocketServer.clients.forEach(client => {
              if (client.roomKey !== connection.socket.roomKey) return; 
              client.properties.set(body.property, body.value);
              client.send(JSON.stringify({
                messages: [message]
              })); // santize body (specically userId)
          }); 
        }
      }); 
    });
  })
}

export default unity;
