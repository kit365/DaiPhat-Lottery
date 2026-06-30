import { useState } from 'react';
import {
    Box,
    Drawer,
    IconButton,
    Typography,
    Divider
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

import { ChatList, ChatWindow, ChatDetails } from './sections';
import { useConversations } from './hooks/useChat';
import { Conversation } from './types/chat';

export const ChatPage = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    
    const { data: conversations = [] } = useConversations();
    const activeConversation = conversations.find((c: Conversation) => c._id === selectedId);
    const participant = activeConversation?.participants[0];

    const handleSelectConversation = (id: string) => {
        setSelectedId(id);
        setDrawerOpen(true);
        setShowDetails(false); // Hide details by default when opening a new chat
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        // Do not unset selectedId so the exit animation works smoothly
    };

    return (
        <Box sx={{ pb: 5 }}>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Hỗ trợ trực tuyến"} />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Hỗ trợ trực tuyến" }
                        ]}
                    />
                </div>
            </div>

            {/* Conversation List Table */}
            <ChatList 
                conversations={conversations} 
                onSelectConversation={handleSelectConversation} 
            />

            {/* Chat Drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={handleCloseDrawer}
                PaperProps={{
                    sx: { 
                        width: '100vw',
                        maxWidth: 1200, // Very wide, almost full screen on most laptops
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                {/* Drawer Header */}
                <Box sx={{ 
                    p: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--palette-divider)',
                    bgcolor: 'var(--palette-background-neutral)'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Chi tiết hội thoại
                    </Typography>
                    <IconButton onClick={handleCloseDrawer} size="small">
                        <Icon icon="eva:close-fill" width={24} />
                    </IconButton>
                </Box>

                {/* Drawer Content */}
                {selectedId && (
                    <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
                        {/* Chat Window */}
                        <Box sx={{ 
                            flexGrow: 1, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            bgcolor: '#f8f9fa',
                            position: 'relative'
                        }}>
                            <ChatWindow 
                                conversationId={selectedId} 
                                onToggleDetails={() => setShowDetails(!showDetails)}
                            />
                        </Box>

                        {showDetails && (
                            <>
                                <Divider orientation="vertical" flexItem />

                                {/* Chat Details (Customer Info) */}
                                <Box sx={{ width: 340, flexShrink: 0, bgcolor: 'white', overflowY: 'auto' }}>
                                    <ChatDetails participant={participant} />
                                </Box>
                            </>
                        )}
                    </Box>
                )}
            </Drawer>
        </Box>
    );
};
