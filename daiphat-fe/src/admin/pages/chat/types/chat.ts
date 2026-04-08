export interface Participant {
    _id: string;
    fullName: string;
    avatar?: string;
    status?: 'active' | 'inactive';
    email?: string;
    phone?: string;
}

export interface Message {
    _id: string;
    senderId: string;
    conversationId: string;
    content: string;
    type: 'text' | 'image' | 'file';
    contentType?: string;
    createdAt: string;
    status: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
    _id: string;
    participants: Participant[];
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
    type: 'direct' | 'group';
    name?: string; // For group chats
}
