import {
    Box,
    TextField,
    Typography,
    Avatar,
    InputAdornment,
    List,
    ListItemButton,
    Badge,
    CircularProgress,
    Stack,
    IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useState, useMemo } from 'react';
import { useConversations } from '../hooks/useChat';
import { Conversation } from '../types/chat';
import dayjs from 'dayjs';

interface ChatSidebarProps {
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export const ChatSidebar = ({ selectedId, onSelect }: ChatSidebarProps) => {
    const [search, setSearch] = useState('');
    const { data: conversations, isLoading } = useConversations();

    const filtered = useMemo(() => {
        if (!conversations) return [];
        if (!search.trim()) return conversations;
        const q = search.toLowerCase();
        return conversations.filter((c: Conversation) => {
            const participant = c.participants[0];
            return (
                participant?.fullName?.toLowerCase().includes(q) ||
                participant?.phone?.includes(q) ||
                participant?.email?.toLowerCase().includes(q)
            );
        });
    }, [conversations, search]);

    return (
        <Box
            sx={{
                width: 320,
                borderRight: '1px solid var(--palette-divider)',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'var(--palette-background-paper)',
                flexShrink: 0,
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2.5, pb: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 700, 
                            fontFamily: 'Barlow, sans-serif',
                        }}
                    >
                        Messages
                    </Typography>
                    <IconButton size="small">
                        <Icon icon="solar:pen-new-square-bold" width={20} />
                    </IconButton>
                </Stack>

                {/* Search */}
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search customers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Icon icon="solar:magnifer-linear" color="var(--palette-text-disabled)" width={18} />
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 1.5,
                            bgcolor: 'var(--palette-background-neutral)',
                            '& fieldset': { border: 'none' },
                        },
                    }}
                />
            </Box>

            {/* Conversation List */}
            <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1, py: 1 }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : filtered.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                            No conversations found
                        </Typography>
                    </Box>
                ) : (
                    filtered.map((conv: Conversation) => {
                        const contact = conv.participants[0];
                        const isSelected = selectedId === conv._id;
                        const lastMsg = conv.lastMessage;
                        
                        return (
                            <ListItemButton
                                key={conv._id}
                                selected={isSelected}
                                onClick={() => onSelect(conv._id)}
                                sx={{
                                    borderRadius: 1.5,
                                    mb: 0.5,
                                    p: 1.5,
                                    '&.Mui-selected': {
                                        bgcolor: 'var(--palette-background-neutral)',
                                        '&:hover': { bgcolor: 'rgba(145,158,171,0.12)' },
                                    },
                                    '&:hover': { bgcolor: 'rgba(145,158,171,0.08)' },
                                }}
                            >
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    variant="dot"
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            border: '2px solid white',
                                            bgcolor: contact.status === 'active' ? '#44b700' : '#919EAB',
                                        }
                                    }}
                                >
                                    <Avatar
                                        src={contact.avatar}
                                        sx={{ width: 48, height: 48 }}
                                    >
                                        {contact.fullName?.[0]?.toUpperCase()}
                                    </Avatar>
                                </Badge>

                                <Box sx={{ ml: 2, flexGrow: 1, minWidth: 0 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                                            {contact.fullName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                            {dayjs(conv.updatedAt).format('HH:mm')}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography 
                                            variant="caption" 
                                            noWrap 
                                            sx={{ 
                                                color: 'text.secondary',
                                                fontWeight: conv.unreadCount > 0 ? 600 : 400
                                            }}
                                        >
                                            {lastMsg?.senderId === 'admin' ? 'You: ' : ''}{lastMsg?.content}
                                        </Typography>
                                        {conv.unreadCount > 0 && (
                                            <Box 
                                                sx={{ 
                                                    minWidth: 16, 
                                                    height: 16, 
                                                    borderRadius: '50%', 
                                                    bgcolor: 'var(--palette-primary-main)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.65rem'
                                                }}
                                            >
                                                {conv.unreadCount}
                                            </Box>
                                        )}
                                    </Stack>
                                </Box>
                            </ListItemButton>
                        );
                    })
                )}
            </List>
        </Box>
    );
};
