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
      JOIN_ROOM = "join_room",
      JOINED_ROOM = "joined_room",
      CREATE_ROOM = "create_room",
      CREATED_ROOM = "created_room",
      LEFT_ROOM = "left_room",
      SET_USER_PROPERTY = "set_user_property",
      BATCH_TRANSFORM = "batch_transform",
      BROADCAST_METHOD_CALL = "broadcast_method_call",
    }

  export interface BatchTransform
    {
        type: "transform"; // transform
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