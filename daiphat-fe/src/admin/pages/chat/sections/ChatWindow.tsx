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
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage, useConversations } from '../hooks/useChat';
import { Conversation, Message } from '../types/chat';
import dayjs from 'dayjs';

interface ChatWindowProps {
    conversationId: string | null;
}

export const ChatWindow = ({ conversationId }: ChatWindowProps) => {
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
                    bgcolor: 'var(--palette-background-default)',
                }}
            >
                <Box
                    sx={{
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        bgcolor: 'var(--palette-background-neutral)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                    }}
                >
                    <Icon icon="solar:chat-round-dots-bold-duotone" width={80} color="var(--palette-primary-main)" />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Barlow, sans-serif' }}>
                    DaiPhat Chat
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 320 }}>
                    Select a customer from the left to start high-quality lottery consulting.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'var(--palette-background-paper)' }}>
            {/* Header */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                    px: 3,
                    py: 1.5,
                    borderBottom: '1px solid var(--palette-divider)',
                    minHeight: 80,
                    flexShrink: 0,
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
                            sx={{ width: 48, height: 48, fontWeight: 700 }}
                        >
                            {contact?.fullName?.[0]?.toUpperCase()}
                        </Avatar>
                    </Badge>

                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {contact?.fullName || 'Customer'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: contact?.status === 'active' ? '#44b700' : '#919EAB' }} />
                            {contact?.status === 'active' ? 'Online' : 'Offline'}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                    <Tooltip title="Call">
                        <IconButton size="small"><Icon icon="solar:phone-bold" width={20} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Video Call">
                        <IconButton size="small"><Icon icon="solar:videocamera-record-bold" width={20} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Information">
                        <IconButton size="small"><Icon icon="solar:info-circle-bold" width={20} /></IconButton>
                    </Tooltip>
                </Stack>
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
                    bgcolor: 'var(--palette-background-neutral)',
                    backgroundImage: 'radial-gradient(var(--palette-divider) 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                }}
            >
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                        <CircularProgress />
                    </Box>
                ) : messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
                        <Typography variant="body2">No messages yet. Say hi!</Typography>
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
                                            borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                            bgcolor: isMe ? 'var(--palette-grey-800)' : 'white',
                                            color: isMe ? 'white' : 'var(--palette-text-primary)',
                                            boxShadow: isMe ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(145,158,171,0.1)',
                                            border: isMe ? 'none' : '1px solid var(--palette-divider)',
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
                                            opacity: 0.5, 
                                            display: 'block', 
                                            mt: 0.5, 
                                            px: 1,
                                            textAlign: isMe ? 'right' : 'left' 
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
                    px: 3,
                    py: 2,
                    bgcolor: 'var(--palette-background-paper)',
                    borderTop: '1px solid var(--palette-divider)',
                    flexShrink: 0,
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconButton size="small" sx={{ color: 'var(--palette-text-secondary)' }}>
                        <Icon icon="solar:add-circle-bold" width={24} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: 'var(--palette-text-secondary)' }}>
                        <Icon icon="solar:gallery-bold" width={24} />
                    </IconButton>
                    
                    <Stack
                        direction="row"
                        alignItems="center"
                        sx={{
                            flexGrow: 1,
                            px: 2,
                            py: 1,
                            borderRadius: 3,
                            bgcolor: 'var(--palette-background-neutral)',
                            transition: 'all 0.2s',
                            '&:focus-within': { 
                                bgcolor: 'white',
                                boxShadow: '0 0 0 2px var(--palette-text-disabled)' 
                            },
                        }}
                    >
                        <InputBase
                            fullWidth
                            multiline
                            maxRows={4}
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            sx={{ fontSize: '0.9375rem' }}
                        />
                        <IconButton
                            onClick={handleSend}
                            disabled={!message.trim()}
                            sx={{
                                color: message.trim() ? 'var(--palette-primary-main)' : 'var(--palette-text-disabled)',
                                transition: 'all 0.2s',
                                p: 0.5,
                            }}
                        >
                            <Icon icon="solar:paperwheel-bold" width={28} />
                        </IconButton>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    );
};
