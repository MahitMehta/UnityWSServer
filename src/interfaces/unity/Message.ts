export namespace Message {
  export interface Message<T> {
    type: Type,
    body: T
  }
  
  export interface RoomBody {
    name: string; 
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
    }

  export interface BatchTransform
    {
        type: "position" | "rotation" | "velocity"; // position | rotation
        go: string;  // gameobject name
        userId: string;
        vector: number[]; 
        ts: number; 
    }
  
  export interface BatchTransformationBody
    {
        transformations: BatchTransform[];  
    }

}