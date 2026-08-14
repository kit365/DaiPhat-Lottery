"use client";

import { useState } from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../../components/ui/PageHeader';

import { AiServiceControl, ChatList, ChatWindow, ChatSidebar } from '../sections';
import { useConversations } from '../../hooks/useChat';
import { useChatOperatorSocket } from '../../hooks/useChatSocket';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { groupConversationsByCustomer } from '../utils';

export const ChatPage = () => {
    const [viewMode, setViewMode] = useState<'TABLE' | 'MESSENGER'>('TABLE');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState(true);
    const userId = useAuthStore((state) => state.user?.id);

    const { data: conversations = [] } = useConversations();
    const groupedConversations = groupConversationsByCustomer(conversations);
    useChatOperatorSocket({
        currentUserId: userId,
        onConversationRemoved: (conversationId) => {
            setSelectedId((prev) => (prev === conversationId ? null : prev));
        },
    });

    const handleSelectConversation = (id: number) => {
        setSelectedId(id);
        setViewMode('MESSENGER');
        setShowDetails(true);
    };

    return (
        <div className="admin-list-page">
            <PageHeader title="Hỗ trợ trực tuyến" disableBottomMargin />

            {viewMode !== 'MESSENGER' && <AiServiceControl />}

            <ChatList
                conversations={groupedConversations}
                onSelectConversation={handleSelectConversation}
                onToggleMode={() => setViewMode(viewMode === 'TABLE' ? 'MESSENGER' : 'TABLE')}
                viewMode={viewMode}
                messengerContent={(listConversations) => (
                    <Box
                        sx={{
                            height: 'calc(100vh - 220px)',
                            minHeight: 520,
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'stretch',
                            overflow: 'hidden',
                            bgcolor: 'var(--palette-background-paper)',
                            borderRadius: '16px',
                            border: '1px solid rgba(145, 158, 171, 0.16)',
                            boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
                        }}
                    >
                        <ChatSidebar
                            conversations={listConversations}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onBackToList={() => setViewMode('TABLE')}
                        />

                        <Box
                            sx={{
                                flex: '1 1 auto',
                                minWidth: 0,
                                minHeight: 0,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: 'var(--palette-background-paper)',
                            }}
                        >
                            <ChatWindow
                                conversationId={selectedId}
                                recipients={listConversations}
                                onSelectRecipient={setSelectedId}
                                showDetails={showDetails}
                                onToggleDetails={() => setShowDetails((prev) => !prev)}
                            />
                        </Box>
                    </Box>
                )}
            />
        </div>
    );
};
