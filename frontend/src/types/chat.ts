export interface Chat {
    id: string;
    title: string;
    description: string;
    ownerId: string;
    ownerName: string;
}

export interface Message {
    id: string;
    text: string;
    edited: boolean;
    ownerFirstName: string;
    ownerLastName: string;
    ownerMiddleName: string | null;
    ownerId: string;
    chatId: string;
    repeatedMessageId: string | null;
    createdAt?: string;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
}

export interface WebSocketEvent {
    type: 'NEW_MESSAGE' | 'MESSAGE_UPDATED' | 'CHAT_CREATED' | 'USER_JOINED' | 'CHAT_UPDATED' | 'CHAT_DELETED' | 'USER_LEFT';
    payload: any;
}

