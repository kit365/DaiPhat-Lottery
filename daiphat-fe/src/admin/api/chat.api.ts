import { Conversation, Message, Participant } from "../pages/chat/types/chat";

// Mock Data
const MOCK_PARTICIPANTS: Participant[] = [
    { _id: 'u1', fullName: 'Nguyễn Văn An', status: 'active', email: 'an.nv@gmail.com', phone: '0901234567', avatar: 'https://api-dev-minimal-v510.vercel.app/assets/images/avatar/avatar_1.jpg' },
    { _id: 'u2', fullName: 'Lê Thị Bình', status: 'inactive', email: 'binh.lt@gmail.com', phone: '0912345678', avatar: 'https://api-dev-minimal-v510.vercel.app/assets/images/avatar/avatar_2.jpg' },
    { _id: 'u3', fullName: 'Trần Văn Cường', status: 'active', email: 'cuong.tv@gmail.com', phone: '0923456789', avatar: 'https://api-dev-minimal-v510.vercel.app/assets/images/avatar/avatar_3.jpg' },
    { _id: 'u4', fullName: 'Phạm Thị Duyên', status: 'active', email: 'duyen.pt@gmail.com', phone: '0934567890', avatar: 'https://api-dev-minimal-v510.vercel.app/assets/images/avatar/avatar_4.jpg' },
];

const MOCK_CONVERSATIONS: Conversation[] = [
    {
        _id: 'c1',
        participants: [MOCK_PARTICIPANTS[0]],
        unreadCount: 2,
        updatedAt: new Date().toISOString(),
        type: 'direct',
        lastMessage: {
            _id: 'm1',
            senderId: 'u1',
            conversationId: 'c1',
            content: 'Chào admin, mình muốn hỏi về kết quả xổ số miền Bắc hôm nay.',
            type: 'text',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            status: 'delivered'
        }
    },
    {
        _id: 'c2',
        participants: [MOCK_PARTICIPANTS[1]],
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        type: 'direct',
        lastMessage: {
            _id: 'm2',
            senderId: 'admin',
            conversationId: 'c2',
            content: 'Đã hoàn thành việc đặt vé cho bạn nhé.',
            type: 'text',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'read'
        }
    },
    {
        _id: 'c3',
        participants: [MOCK_PARTICIPANTS[2]],
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
        type: 'direct',
        lastMessage: {
            _id: 'm3',
            senderId: 'u3',
            conversationId: 'c3',
            content: 'Cảm ơn admin nhé!',
            type: 'text',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            status: 'read'
        }
    }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
    'c1': [
        { _id: 'm1-1', senderId: 'u1', conversationId: 'c1', content: 'Alo admin ơi', type: 'text', createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'read' },
        { _id: 'm1-2', senderId: 'admin', conversationId: 'c1', content: 'Chào bạn, mình có thể giúp gì cho bạn?', type: 'text', createdAt: new Date(Date.now() - 7100000).toISOString(), status: 'read' },
        { _id: 'm1', senderId: 'u1', conversationId: 'c1', content: 'Chào admin, mình muốn hỏi về kết quả xổ số miền Bắc hôm nay.', type: 'text', createdAt: new Date(Date.now() - 3600000).toISOString(), status: 'delivered' },
    ],
    'c2': [
        { _id: 'm2-1', senderId: 'u2', conversationId: 'c2', content: 'Admin check giúp mình đơn vé #123456', type: 'text', createdAt: new Date(Date.now() - 90000000).toISOString(), status: 'read' },
        { _id: 'm2', senderId: 'admin', conversationId: 'c2', content: 'Đã hoàn thành việc đặt vé cho bạn nhé.', type: 'text', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'read' },
    ]
};

// API Functions
export const getConversations = async (): Promise<{ data: Conversation[] }> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve({ data: MOCK_CONVERSATIONS }), 500);
    });
};

export const getMessages = async (conversationId: string): Promise<{ data: Message[] }> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve({ data: MOCK_MESSAGES[conversationId] || [] }), 500);
    });
};

export const sendMessage = async (conversationId: string, content: string): Promise<{ data: Message }> => {
    return new Promise((resolve) => {
        const newMessage: Message = {
            _id: Math.random().toString(36).substring(7),
            senderId: 'admin',
            conversationId,
            content,
            type: 'text',
            createdAt: new Date().toISOString(),
            status: 'sent'
        };
        setTimeout(() => resolve({ data: newMessage }), 300);
    });
};
