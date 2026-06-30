import {
    Box,
    Stack,
    Typography,
    Avatar,
    Badge,
    IconButton,
    InputBase,
    CircularProgress,
    Tooltip,
    Button,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage, useConversations } from '../hooks/useChat';
import { Conversation, Message } from '../types/chat';
import dayjs from 'dayjs';

interface ChatWindowProps {
    conversationId: string | null;
    onToggleDetails?: () => void;
}

export const ChatWindow = ({ conversationId, onToggleDetails }: ChatWindowProps) => {
    const [message, setMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const { data: conversations } = useConversations();
    const { data: messages, isLoading } = useMessages(conversationId);
    const { mutate: sendMessage } = useSendMessage(conversationId);

    const activeConversation = conversations?.find((c: Conversation) => c._id === conversationId);
    const contact = activeConversation?.participants[0];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!message.trim()) return;
        sendMessage(message);
        setMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Empty state
    if (!conversationId) {
        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                    textAlign: 'center',
                }}
            >
                <Box
                    sx={{
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        bgcolor: 'rgba(223, 27, 28, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                    }}
                >
                    <Icon icon="solar:chat-round-dots-bold-duotone" width={80} color="#df1b1c" />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Barlow, sans-serif' }}>
                    Đại Phát Support
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 320 }}>
                    Chọn một hội thoại để bắt đầu tư vấn.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                    px: 3,
                    py: 1.5,
                    borderBottom: '1px solid #eee',
                    minHeight: 70,
                    flexShrink: 0,
                    bgcolor: 'white'
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        variant="dot"
                        sx={{
                            '& .MuiBadge-badge': {
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                border: '2px solid white',
                                bgcolor: contact?.status === 'active' ? '#44b700' : '#919EAB',
                            }
                        }}
                    >
                        <Avatar
                            src={contact?.avatar}
                            sx={{ width: 44, height: 44, fontWeight: 700, cursor: 'pointer' }}
                            onClick={onToggleDetails}
                        >
                            {contact?.fullName?.[0]?.toUpperCase()}
                        </Avatar>
                    </Badge>

                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                {contact?.fullName || 'Khách hàng'}
                            </Typography>
                            <Box sx={{ bgcolor: '#ffedd5', color: '#f97316', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.7rem', fontWeight: 600 }}>
                                Chờ nhân viên nhận
                            </Box>
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Icon icon="solar:clock-circle-bold" /> Đã chờ 02:31
                        </Typography>
                    </Box>
                </Stack>

                <Button 
                    variant="contained" 
                    sx={{ 
                        bgcolor: '#df1b1c', 
                        color: 'white', 
                        fontWeight: 600, 
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#c11718', boxShadow: 'none' } 
                    }}
                >
                    Nhận hội thoại
                </Button>
            </Stack>

            {/* Messages */}
            <Box
                ref={scrollRef}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5,
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ bgcolor: 'white', border: '1px solid #eee', borderRadius: 2, px: 2, py: 1, display: 'inline-flex', alignItems: 'center', gap: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <Icon icon="solar:smart-home-bold" color="#22c55e" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>AI đã trả lời 5 tin nhắn</Typography>
                        <Typography variant="body2" sx={{ color: '#0061C1', cursor: 'pointer', fontWeight: 600, ml: 1 }}>Xem lịch sử AI</Typography>
                    </Box>
                </Box>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                        <CircularProgress />
                    </Box>
                ) : messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
                        <Typography variant="body2">Chưa có tin nhắn.</Typography>
                    </Box>
                ) : (
                    messages.map((msg: Message) => {
                        const isMe = msg.senderId === 'admin';
                        return (
                            <Stack
                                key={msg._id}
                                direction="row"
                                justifyContent={isMe ? 'flex-end' : 'flex-start'}
                                alignItems="flex-end"
                                spacing={1}
                            >
                                {!isMe && (
                                    <Avatar src={contact?.avatar} sx={{ width: 28, height: 28, mb: 0.5 }}>
                                        {contact?.fullName?.[0]}
                                    </Avatar>
                                )}
                                <Box
                                    sx={{
                                        maxWidth: '70%',
                                        position: 'relative',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.25,
                                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            bgcolor: isMe ? '#df1b1c' : 'white',
                                            color: isMe ? 'white' : 'text.primary',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                            border: isMe ? 'none' : '1px solid #eee',
                                            position: 'relative',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                            {msg.content}
                                        </Typography>
                                    </Box>
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            opacity: 0.6, 
                                            display: 'block', 
                                            mt: 0.5, 
                                            px: 1,
                                            textAlign: isMe ? 'right' : 'left',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        {dayjs(msg.createdAt).format('HH:mm')}
                                    </Typography>
                                </Box>
                            </Stack>
                        );
                    })
                )}
            </Box>

            {/* Input bar */}
            <Box
                sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderTop: '1px solid #eee',
                    flexShrink: 0,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: '#f8f9fa',
                        border: '1px solid #e5e7eb',
                        borderRadius: '50px',
                        p: 0.5,
                        pl: 2,
                        transition: 'all 0.2s',
                        '&:focus-within': {
                            borderColor: '#fca5a5',
                            boxShadow: '0 0 0 1px #fee2e2'
                        }
                    }}
                >
                    <InputBase
                        fullWidth
                        placeholder="Nhập câu trả lời..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        sx={{ fontSize: '0.9375rem', mr: 1 }}
                    />
                    
                    <Button
                        variant="contained"
                        onClick={handleSend}
                        disabled={!message.trim()}
                        sx={{
                            minWidth: 'auto',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            p: 0,
                            bgcolor: '#df1b1c',
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            '&:hover': { bgcolor: '#c11718' },
                            '&.Mui-disabled': { bgcolor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' },
                            '& .MuiButton-startIcon': { margin: 0 } // Reset if icon inherits margin
                        }}
                    >
                        <Icon icon="solar:plain-bold" width={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};
