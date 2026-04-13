import { useState } from 'react';
import {
    Box,
    Card,
    Stack,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Title } from '../../components/ui/Title';
import { ChatSidebar, ChatWindow, ChatDetails } from './sections';
import { useConversations } from './hooks/useChat';
import { Conversation } from './types/chat';

export const ChatPage = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(true);
    
    const { data: conversations } = useConversations();
    const activeConversation = conversations?.find((c: Conversation) => c._id === selectedId);
    const participant = activeConversation?.participants[0];

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Title title="Chat Management" />
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Refresh">
                        <IconButton><Icon icon="solar:refresh-bold" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Settings">
                        <IconButton><Icon icon="solar:settings-bold" /></IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <Card
                sx={{
                    flexGrow: 1,
                    height: 'calc(100vh - 180px)',
                    display: 'flex',
                    borderRadius: 3,
                    boxShadow: 'var(--customShadows-z24)',
                    overflow: 'hidden',
                    bgcolor: 'var(--palette-background-paper)',
                    border: '1px solid var(--palette-divider)',
                }}
            >
                <ChatSidebar
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId(id)}
                />

                <Box sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    bgcolor: 'var(--palette-background-default)',
                    position: 'relative'
                }}>
                    <ChatWindow conversationId={selectedId} />
                    
                    {/* Toggle details button when hidden */}
                    {!showDetails && selectedId && (
                        <IconButton
                            onClick={() => setShowDetails(true)}
                            sx={{
                                position: 'absolute',
                                right: 16,
                                top: 16,
                                bgcolor: 'white',
                                boxShadow: 'var(--customShadows-z8)',
                                '&:hover': { bgcolor: 'var(--palette-background-neutral)' }
                            }}
                        >
                            <Icon icon="solar:info-circle-bold" />
                        </IconButton>
                    )}
                </Box>

                {showDetails && selectedId && (
                    <Box sx={{ position: 'relative' }}>
                        <ChatDetails participant={participant} />
                        <IconButton
                            size="small"
                            onClick={() => setShowDetails(false)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                zIndex: 1,
                            }}
                        >
                            <Icon icon="solar:close-circle-bold" />
                        </IconButton>
                    </Box>
                )}
            </Card>
        </Box>
    );
};
