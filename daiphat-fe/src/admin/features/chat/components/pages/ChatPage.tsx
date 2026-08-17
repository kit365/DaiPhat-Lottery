"use client";

import { useEffect, useState } from 'react';
import {
    Box,
    Divider
} from '@mui/material';
import { PageHeader } from '../../../../components/ui/PageHeader';

import { AiServiceControl, ChatList, ChatWindow, ChatDetails } from '../sections';
import { useConversations } from '../../hooks/useChat';
import { useAdminChatInboxSocket, useChatOperatorSocket } from '../../hooks/useChatSocket';
import { Conversation, ConversationStatusEnum } from '../../../../../types/chat.type';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { AppToast as toast } from '../../../../../utils/toast.util';
import { findOwnLiveConversation, groupConversationsByCustomer } from '../utils';

export const ChatPage = () => {
    const [viewMode, setViewMode] = useState<'TABLE' | 'MESSENGER'>('TABLE');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [listPeek, setListPeek] = useState(false);
    const userId = useAuthStore((state) => state.user?.id);

    const { data: conversations = [] } = useConversations();
    const groupedConversations = groupConversationsByCustomer(conversations);
    const ownLiveConversation = findOwnLiveConversation(conversations, userId);

    useEffect(() => {
        if (!ownLiveConversation) {
            setListPeek(false);
            return;
        }
        if (ownLiveConversation.status === ConversationStatusEnum.ACTIVE) {
            setListPeek(false);
            setSelectedId(ownLiveConversation.id);
            setViewMode('MESSENGER');
        }
    }, [ownLiveConversation?.id, ownLiveConversation?.status]);

    useChatOperatorSocket({
        currentUserId: userId,
        selectedConversationId: selectedId,
        onConversationRemoved: (conversationId) => {
            setSelectedId((prev) => (prev === conversationId ? null : prev));
        },
        onAssignedToMe: (conversationId) => {
            setListPeek(false);
            setSelectedId(conversationId);
            setViewMode('MESSENGER');
            setShowDetails(false);
        },
    });
    useAdminChatInboxSocket({
        selectedConversationId: selectedId,
    });
    const focusedConversationId = !listPeek && ownLiveConversation
        ? ownLiveConversation.id
        : selectedId;
    const activeConversation = groupedConversations.find((c: Conversation) => c.id === focusedConversationId)
        ?? conversations.find((c: Conversation) => c.id === focusedConversationId);

    const handleSelectConversation = (id: number) => {
        if (ownLiveConversation && id !== ownLiveConversation.id) {
            toast.info('Hãy xử lý xong khách đang hỗ trợ trước khi mở hội thoại khác.');
            return;
        }
        setListPeek(false);
        setSelectedId(id);
        setViewMode('MESSENGER');
        setShowDetails(false);
    };

    const handleBackToList = () => {
        setListPeek(Boolean(ownLiveConversation));
        setViewMode('TABLE');
        setShowDetails(false);
        if (!ownLiveConversation) {
            setSelectedId(null);
        }
    };

    const handleSessionEnded = () => {
        setListPeek(false);
        setSelectedId(null);
        setViewMode('TABLE');
        setShowDetails(false);
    };

    const handleReturnToLockedChat = () => {
        if (!ownLiveConversation) {
            return;
        }
        setListPeek(false);
        setSelectedId(ownLiveConversation.id);
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
                viewMode={listPeek ? 'TABLE' : viewMode}
                chatLocked={Boolean(ownLiveConversation)}
                lockedConversationId={ownLiveConversation?.id ?? null}
                onReturnToLockedChat={handleReturnToLockedChat}
                messengerContent={() => (
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
                                conversationId={focusedConversationId}
                                onToggleDetails={() => setShowDetails(!showDetails)}
                                onBackToList={handleBackToList}
                                onSessionEnded={handleSessionEnded}
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
