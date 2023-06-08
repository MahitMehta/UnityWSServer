export namespace Message {
  export interface MessagesContainer {
    messages: Message<RoomBody | UserPropertyBody | BatchTransformationBody | BroadcastMethodCallBody>[];
  }

  export interface Message<T> {
    type: Type,
    body: T
  }

  export interface Message<T> {
    type: Type,
    body: T
  }
  
  export interface RoomBody {
    name: string; 
  }

  export interface BroadcastMethodCallBody {
    method: string; // name of the method to be called
  }

  export interface UserPropertyBody {
    property: "username",
    value: string; 
    userId: string; 
  }
  
  export enum Type {
      JOIN_ROOM,
      JOINED_ROOM,
      CREATE_ROOM,
      CREATED_ROOM,
      LEFT_ROOM,
      SET_USER_PROPERTY,
      BATCH_TRANSFORM,
      BROADCAST_METHOD_CALL,
      SYNC_TICK,
      LEAVE_GAME
    }

  export interface BatchTransform
    {
        type: "transform" | "instantiate"; // transform, instantiate
        go: string;  // gameobject name
        userId: string;
        position?: number[]; // type = transform
        rotation?: number[]; // type = transform
        ts: number; 
    }
  
  export interface BatchTransformationBody
    {
        transformations: BatchTransform[];  
    }

}