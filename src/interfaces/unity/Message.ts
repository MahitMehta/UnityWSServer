export namespace Message {
  export interface Message<T> {
    type: Type,
    body: T
  }
  
  export interface RoomBody {
    name: string; 
  }
  
  export enum Type {
      JOIN_ROOM = "join_room",
      JOINED_ROOM = "joined_room",
      CREATE_ROOM = "create_room",
      CREATED_ROOM = "created_room",
      LEFT_ROOM = "left_room",
      BATCH_TRANSFORM = "batch_transform",
    }

  export interface BatchTransform
    {
        type: "position" | "rotation"; // position | rotation
        go: string;  // gameobject name
        userId: string;
        vector: number[]; 
    }
  
  export interface BatchTransformationBody
    {
        transformations: BatchTransform[];  
    }

}