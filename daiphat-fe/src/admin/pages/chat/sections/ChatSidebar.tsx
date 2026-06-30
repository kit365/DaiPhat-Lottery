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
            <Box sx={{ p: 2, pb: 1 }}>
                {/* Search */}
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm kiếm hội thoại..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Icon icon="solar:magnifer-linear" color="var(--palette-text-disabled)" width={18} />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton size="small"><Icon icon="solar:filter-linear" width={18} /></IconButton>
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 1.5,
                            bgcolor: 'white',
                            border: '1px solid #eee',
                            '& fieldset': { border: 'none' },
                        },
                    }}
                />
                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 0.5, px: 1 }}>
                        Sắp xếp: <b>Mới nhất</b> <Icon icon="solar:alt-arrow-down-linear" width={14} />
                    </Typography>
                </Box>
            </Box>

            {/* Conversation List */}
            <List sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 1 }}>
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
                    filtered.map((conv: Conversation, idx: number) => {
                        const contact = conv.participants[0];
                        const isSelected = selectedId === conv._id;
                        const lastMsg = conv.lastMessage;
                        
                        // Fake statuses for mockup
                        const mockStatus = idx % 3 === 0 ? 'AI đang xử lý' : 'Chờ nhân viên';
                        const mockStatusColor = mockStatus === 'AI đang xử lý' ? '#22c55e' : '#f97316';
                        const mockStatusBg = mockStatus === 'AI đang xử lý' ? '#dcfce7' : '#ffedd5';
                        
                        return (
                            <ListItemButton
                                key={conv._id}
                                selected={isSelected}
                                onClick={() => onSelect(conv._id)}
                                sx={{
                                    borderRadius: 1.5,
                                    mb: 1.5,
                                    p: 1.5,
                                    bgcolor: 'white',
                                    border: isSelected ? '1px solid #df1b1c' : '1px solid transparent',
                                    boxShadow: isSelected ? '0 0 0 1px #df1b1c' : '0 2px 4px rgba(0,0,0,0.02)',
                                    '&.Mui-selected': {
                                        bgcolor: '#fff5f5',
                                        '&:hover': { bgcolor: '#fff5f5' },
                                    },
                                    '&:hover': { bgcolor: '#f8f9fa' },
                                    display: 'flex',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <Avatar
                                    src={contact.avatar}
                                    sx={{ width: 40, height: 40, mr: 1.5, border: '1px solid #eee' }}
                                >
                                    {contact.fullName?.[0]?.toUpperCase()}
                                </Avatar>

                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {contact.fullName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                                            {dayjs(conv.updatedAt).format('HH:mm')}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Typography 
                                            variant="body2" 
                                            noWrap 
                                            sx={{ 
                                                color: isSelected ? 'text.primary' : 'text.secondary', 
                                                maxWidth: '120px',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            {lastMsg?.senderId === contact.id ? '' : 'You: '}
                                            {lastMsg?.text || 'Bắt đầu cuộc trò chuyện'}
                                        </Typography>
                                        
                                        <Box sx={{ 
                                            bgcolor: mockStatusBg, 
                                            color: mockStatusColor, 
                                            px: 1, 
                                            py: 0.25, 
                                            borderRadius: 1, 
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {mockStatus}
                                        </Box>
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
