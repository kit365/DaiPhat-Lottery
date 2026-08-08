"use client";

import { useState } from 'react';
import {
    Box,
    Divider
} from '@mui/material';
import { PageHeader } from '../../../../components/ui/PageHeader';

import { AiServiceControl, ChatList, ChatWindow, ChatDetails, ChatSidebar } from '../sections';
import { useConversations } from '../../hooks/useChat';
import { useChatOperatorSocket } from '../../hooks/useChatSocket';
import { Conversation } from '../../../../../types/chat.type';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { groupConversationsByCustomer } from '../utils';

export const ChatPage = () => {
    const [viewMode, setViewMode] = useState<'TABLE' | 'MESSENGER'>('TABLE');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const userId = useAuthStore((state) => state.user?.id);

    const { data: conversations = [] } = useConversations();
    const groupedConversations = groupConversationsByCustomer(conversations);
    useChatOperatorSocket({
        currentUserId: userId,
        onConversationRemoved: (conversationId) => {
            setSelectedId((prev) => (prev === conversationId ? null : prev));
        },
    });
    const activeConversation = groupedConversations.find((c: Conversation) => c.id === selectedId)
        ?? conversations.find((c: Conversation) => c.id === selectedId);

    const handleSelectConversation = (id: number) => {
        setSelectedId(id);
        setViewMode('MESSENGER');
        setShowDetails(false);
    };

    return (
        <div className="admin-list-page">
            <PageHeader
                title="Hỗ trợ trực tuyến"
                breadcrumbItems={[
                            { label: 'Dashboard', to: '/' },
                            { label: 'Hỗ trợ trực tuyến' },
                        ]}
            />

            <AiServiceControl />

            <ChatList
                conversations={groupedConversations}
                onSelectConversation={handleSelectConversation}
                onToggleMode={() => setViewMode(viewMode === 'TABLE' ? 'MESSENGER' : 'TABLE')}
                viewMode={viewMode}
                messengerContent={(filteredConversations) => (
                    <Box
                        className="admin-list-card"
                        sx={{
                            height: 'calc(100vh - 220px)',
                            minHeight: 600,
                            display: 'flex',
                            overflow: 'hidden',
                            bgcolor: 'var(--palette-background-paper)',
                        }}
                    >
                        <ChatSidebar
                            conversations={filteredConversations}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                        />

                        <Box
                            sx={{
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: 'var(--palette-background-neutral)',
                                position: 'relative',
                            }}
                        >
                            <ChatWindow
                                conversationId={selectedId}
                                onToggleDetails={() => setShowDetails(!showDetails)}
                            />
                        </Box>

                        {showDetails && (
                            <>
                                <Divider orientation="vertical" flexItem />
                                <Box
                                    sx={{
                                        width: 340,
                                        flexShrink: 0,
                                        bgcolor: 'var(--palette-background-paper)',
                                        overflowY: 'auto',
                                    }}
                                >
                                    <ChatDetails conversation={activeConversation} />
                                </Box>
                            </>
                        )}
                    </Box>
                )}
            />
        </div>
    );
};
