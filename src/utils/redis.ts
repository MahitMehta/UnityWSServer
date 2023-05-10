export const ROOM_IDENTIFIER: string = "room";

export const generateRoomKey = (roomKey: string) => {
    return `${ROOM_IDENTIFIER}:${Buffer.from(roomKey).toString("base64")}` 
}

