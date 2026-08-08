"use client";

import { Button } from '@/admin/components/ui/Button';

import { ConversationTitle } from '../components/ConversationTitle';
import { ConversationAvatarLetter } from '../components/ConversationAvatarLetter';
import { getConversationDisplayTitle, getConversationAvatarLetter, getAssigneeDisplayLabel, getConversationPreviewText, getManagementUnreadCount } from '../utils';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box, Card, Tabs, Tab, styled, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Stack, Avatar, IconButton, Chip, Toolbar, Tooltip, SvgIcon, Menu, MenuItem, Badge } from '@mui/material';
import { Icon } from "@iconify/react";
import { adminChatDetailKey, ADMIN_CHAT_CONVERSATIONS_KEY } from '../../hooks/useChat';
import { MessageSenderRole, ConversationStatusEnum } from '../../../../../types/chat.type';
import { SortOrderEnum } from '../../../../../constants/common.constants';
import dayjs from "dayjs";

const WaitTimerChip = ({ startTime }: { startTime: string }) => {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        const calculateElapsed = () => {
            if (!startTime) return '';
            const diffMs = Date.now() - new Date(startTime).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins} phút`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours} giờ ${diffMins % 60}p`;
            return `${Math.floor(diffHours / 24)} ngày`;
        };
        
        setElapsed(calculateElapsed());
        const interval = setInterval(() => setElapsed(calculateElapsed()), 60000);
        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <Chip 
            icon={<Icon icon="mdi:clock-outline" />}
            label={`Chờ ${elapsed}`} 
            size="small" 
            color="error" 
            sx={{ fontWeight: 600 }} 
        />
    );
};

import { AppToast as toast } from '../../../../../utils/toast.util';
import { JiraFilter } from '../../../../shared/data-grid';
import { Search } from '../../../../components/ui/Search';
import { SortButton } from '../../../../components/ui/SortButton';
import { SettingsList } from '../../../../components/ui/SettingsList';
import { Conversation } from '../../../../../types/chat.type';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { useAccounts } from '../../../users/hooks/useUsers';
import { RoleEnum } from '../../../../../types/role.type';

type AssigneeFilter = 'all' | 'unassigned' | 'mine' | string;

const getRoleCode = (role: unknown): string => {
    if (typeof role === 'string') {
        return role;
    }
    if (role && typeof role === 'object' && 'code' in role) {
        return String((role as { code?: string }).code || '');
    }
    return '';
};

const STATUS_LABELS: Record<string, string> = {
    [ConversationStatusEnum.OPEN]: 'Mở',
    [ConversationStatusEnum.ACTIVE]: 'Đang xử lý',
    [ConversationStatusEnum.WAITING_FOR_OPERATOR]: 'Chờ nhân viên nhận',
    [ConversationStatusEnum.WAITING_FOR_CUSTOMER]: 'Chờ khách hàng',
    [ConversationStatusEnum.CLOSED]: 'Đã đóng'
};

const TabBadge = styled('span')(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: "var(--shape-borderRadius-sm)",
    fontSize: "0.75rem",
    fontWeight: 700,
}));

interface ChatListProps {
    conversations: Conversation[];
    onSelectConversation: (id: number) => void;
    onToggleMode?: () => void;
    viewMode?: 'TABLE' | 'MESSENGER';
    messengerContent?: (filteredConversations: Conversation[]) => React.ReactNode;
}

export const ChatList = ({ conversations, onSelectConversation, onToggleMode, viewMode = 'TABLE', messengerContent }: ChatListProps) => {
    const user = useAuthStore((state) => state.user);
    const currentUserId = user?.id;
    const roleCode = getRoleCode(user?.role);
    const isAdmin = roleCode === RoleEnum.ADMIN || roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN';

    const [tabStatus, setTabStatus] = useState('all');
    const [selected, setSelected] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortByUI, setSortByUI] = useState(SortOrderEnum.NEWEST);
    const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);
    
    

    const { data: accountsResponse } = useAccounts(
        { page: 1, limit: 200 },
        { enabled: isAdmin }
    );

    const staffOperators = useMemo(() => {
        const list = accountsResponse?.data?.recordList || [];
        return list.filter((account) => {
            const code = getRoleCode(account.role);
            return code === RoleEnum.STAFF_OPERATOR || code === 'ROLE_STAFF_OPERATOR';
        });
    }, [accountsResponse]);



    const passesAssigneeFilter = (conv: Conversation) => {
        if (!assigneeFilters || assigneeFilters.length === 0) return true;
        return assigneeFilters.some(filter => {
            if (filter === 'unassigned') return !conv.assignedOperatorId;
            if (filter === 'mine') return conv.assignedOperatorId === currentUserId;
            return conv.assignedOperatorId === filter;
        });
    };
    
    // Dummy settings for SettingsList
    const [settings, setSettings] = useState({ density: 'medium', striped: false, bordered: false });

    const waitingCount = conversations.filter(c => c.status === ConversationStatusEnum.WAITING_FOR_OPERATOR).length;

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setTabStatus(newValue);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelecteds = conversations.map((n: Conversation) => n.id);
            setSelected(newSelecteds.map(String));
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
        event.stopPropagation();
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = [...selected, id];
        } else if (selectedIndex === 0) {
            newSelected = selected.slice(1);
        } else if (selectedIndex === selected.length - 1) {
            newSelected = selected.slice(0, -1);
        } else if (selectedIndex > 0) {
            newSelected = [
                ...selected.slice(0, selectedIndex),
                ...selected.slice(selectedIndex + 1),
            ];
        }
        setSelected(newSelected);
    };

    // Filter logic
    const filteredConversations = conversations.filter(conv => {
        const unreadCount = getManagementUnreadCount(conv);
        if (tabStatus === 'unread' && unreadCount === 0) return false;
        if (tabStatus === 'read' && unreadCount > 0) return false;
        if (!passesAssigneeFilter(conv)) return false;
        if (searchQuery) {
            const title = conv.title?.toLowerCase() || '';
            if (!title.includes(searchQuery.toLowerCase())) return false;
        }
        return true;
    }).sort((a, b) => {
        const aTime = new Date(a.updatedAt || 0).getTime();
        const bTime = new Date(b.updatedAt || 0).getTime();
        if ((sortByUI as any) === SortOrderEnum.OLDEST) return aTime - bTime;
        return bTime - aTime;
    });

    const statusCounts = {
        all: conversations.length,
        unread: conversations.filter((c) => getManagementUnreadCount(c) > 0).length,
        read: conversations.filter((c) => getManagementUnreadCount(c) === 0).length,
    };

    const sortOptions = [
        { value: SortOrderEnum.NEWEST, label: "Mới nhất" },
        { value: SortOrderEnum.OLDEST, label: "Cũ nhất" }
    ];


    const assigneeOptions = useMemo(() => {
        const options = [
            { value: 'unassigned', label: 'Chưa phân công' }
        ];
        if (!isAdmin) {
            options.push({ value: 'mine', label: 'Của tôi' });
        } else {
            staffOperators.forEach(staff => {
                options.push({ value: staff.id, label: staff.fullName || `${staff.firstName} ${staff.lastName}`.trim() });
            });
        }
        return options;
    }, [isAdmin, staffOperators]);

    return (
        <Card
            className="admin-list-card admin-list-card--table"
            sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            bgcolor: 'var(--palette-background-paper)',
            boxShadow: "var(--customShadows-card)",
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Tabs
                value={tabStatus}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: '20px',
                    minHeight: "48px",
                    borderBottom: `1px solid var(--palette-background-neutral)`,
                    '& .MuiTabs-flexContainer': { gap: "calc(5 * var(--spacing))" },
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                }}
            >
                {[
                    { value: 'all', label: 'Tất cả', color: 'var(--palette-common-white)', bg: 'var(--palette-grey-800)', activeColor: 'var(--palette-common-white)', activeBg: 'var(--palette-grey-800)' },
                    { value: 'unread', label: 'Chưa đọc', color: 'var(--palette-error-dark)', bg: 'var(--palette-error-lighter)', activeColor: 'var(--palette-error-contrastText)', activeBg: 'var(--palette-error-main)' },
                    { value: 'read', label: 'Đã đọc', color: 'var(--palette-success-dark)', bg: 'var(--palette-success-lighter)', activeColor: 'var(--palette-success-contrastText)', activeBg: 'var(--palette-success-main)' },
                ].map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        disableRipple
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{
                                    fontSize: '0.875rem',
                                    fontWeight: tabStatus === tab.value ? 700 : 500,
                                    color: tabStatus === tab.value ? 'var(--palette-text-primary)' : 'inherit'
                                }}>
                                    {tab.label}
                                </Typography>
                                <TabBadge
                                    sx={{
                                        bgcolor: tabStatus === tab.value ? tab.activeBg : tab.bg,
                                        color: tabStatus === tab.value ? tab.activeColor : tab.color,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {statusCounts[tab.value as keyof typeof statusCounts] || 0}
                                </TabBadge>
                            </Box>
                        }
                        sx={{
                            minWidth: 0,
                            padding: '0',
                            minHeight: '48px',
                            textTransform: 'none',
                            color: 'var(--palette-text-secondary)',
                            '&.Mui-selected': {
                                color: 'var(--palette-text-primary)'
                            },
                        }}
                    />
                ))}
            </Tabs>

            <Toolbar 
                sx={{ 
                    justifyContent: 'space-between',
                    padding: '20px !important',
                    gap: 2,
                    borderBottom: `1px dashed var(--palette-background-neutral)`
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <Search
                        maxWidth="100%"
                        placeholder="Tìm kiếm khách hàng..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <JiraFilter
                        fields={[{ id: 'assignee', label: 'Phân công', options: assigneeOptions }]}
                        selectedFilters={{ assignee: assigneeFilters }}
                        onFilterChange={(id, vals) => setAssigneeFilters(vals)}
                        onClearAll={() => setAssigneeFilters([])}
                        trigger={({ onClick, totalFilterCount }) => (
                            <Button
                                variant="text"
                                size="small"
                                disableElevation
                                onClick={onClick}
                                startIcon={
                                    <Badge
                                        badgeContent={totalFilterCount}
                                        color="primary"
                                        variant="dot"
                                        sx={{ '& .MuiBadge-badge': { backgroundColor: 'var(--palette-error-main)' } }}
                                    >
                                        <SvgIcon sx={{ fontSize: '1.125rem !important' }} viewBox="0 0 24 24">
                                            <g fill="none" fillRule="evenodd">
                                                <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                                <path fill="var(--palette-text-primary)" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z" />
                                            </g>
                                        </SvgIcon>
                                    </Badge>
                                }
                                sx={{
                                    textTransform: 'none',
                                    minWidth: '64px',
                                    minHeight: "30px",
                                    fontSize: "0.8125rem",
                                    padding: '4px',
                                    fontWeight: "700",
                                    borderRadius: "8px",
                                    gap: "6px",
                                    color: totalFilterCount > 0 ? 'var(--palette-primary-main)' : 'var(--palette-text-primary)',
                                    '& .MuiButton-startIcon': { margin: 0 },
                                    '&:hover': { backgroundColor: 'var(--palette-action-hover)' },
                                    '& .MuiButton-icon': { mt: "-2px !important" }
                                }}
                            >
                                Bộ lọc
                            </Button>
                        )}
                    />

                                        {onToggleMode && (
                        <Tooltip title="Chế độ Message">
                            <Button
                                variant="text"
                                size="small"
                                disableElevation
                                startIcon={
                                    <Badge badgeContent={waitingCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 600 } }}>
                                        <Icon icon="solar:chat-square-like-bold-duotone" width={20} />
                                    </Badge>
                                }
                                onClick={onToggleMode}
                                sx={{
                                    textTransform: 'none',
                                    minWidth: '64px',
                                    minHeight: "30px",
                                    fontSize: "0.8125rem",
                                    padding: '4px 8px',
                                    fontWeight: "700",
                                    borderRadius: "8px",
                                    gap: "6px",
                                    color: viewMode === 'MESSENGER' ? 'var(--palette-primary-main)' : 'var(--palette-text-primary)',
                                    bgcolor: viewMode === 'MESSENGER' ? 'var(--palette-action-selected)' : 'transparent',
                                    '& .MuiButton-startIcon': { margin: 0 },
                                    '&:hover': { backgroundColor: 'var(--palette-primary-light)', color: 'var(--palette-primary-main)' },
                                    '& .MuiButton-icon': { mt: "-2px !important" }
                                }}
                            >
                                Chat
                            </Button>
                        </Tooltip>
                    )}

                </Box>
            </Toolbar>





            {viewMode === 'MESSENGER' && messengerContent ? (
                messengerContent(filteredConversations)
            ) : (
                <>
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                <Table sx={{ minWidth: 960 }} size="medium">
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableRow>
                            <TableCell padding="checkbox" sx={{ borderBottom: 'none', textAlign: 'center' }}>
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < filteredConversations.length}
                                    checked={filteredConversations.length > 0 && selected.length === filteredConversations.length}
                                    onChange={handleSelectAllClick}
                                    sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                />
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Khách hàng</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Tin nhắn gần nhất</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Nhân viên phụ trách</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Trạng thái</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Cập nhật lúc</TableCell>
                            <TableCell sx={{ borderBottom: 'none', width: 80 }} align="right" />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {filteredConversations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                    <Typography sx={{ color: 'var(--palette-text-secondary)' }}>
                                        Không có dữ liệu
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredConversations.map((row: Conversation) => {
                                const isItemSelected = selected.indexOf(String(row.id)) !== -1;
                                const hasUnread = getManagementUnreadCount(row) > 0;

                                return (
                                    <TableRow
                                        hover
                                        key={row.id}
                                        selected={isItemSelected}
                                        sx={{ 
                                            cursor: 'pointer',
                                            bgcolor: hasUnread ? 'var(--palette-action-hover)' : 'inherit'
                                        }}
                                        onClick={() => onSelectConversation(row.id)}
                                    >
                                        <TableCell padding="checkbox" sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isItemSelected}
                                                onChange={(event) => handleClick(event as any, String(row.id))}
                                                sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Avatar sx={{ width: 40, height: 40 }}>
                                                    <ConversationAvatarLetter conversation={row} />
                                                </Avatar>
                                                <Box>
                                                    <ConversationTitle conversation={row}  variant="subtitle2" sx={{ fontWeight: hasUnread ? 700 : 600 }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {row.customerId}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" sx={{ 
                                                maxWidth: 300, 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis', 
                                                whiteSpace: 'nowrap',
                                                fontWeight: hasUnread ? 600 : 400,
                                                color: hasUnread ? 'text.primary' : 'text.secondary'
                                            }}>
                                                {getConversationPreviewText(row, STATUS_LABELS, currentUserId)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {getAssigneeDisplayLabel(row, currentUserId)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            {row.status === ConversationStatusEnum.CLOSED ? (
                                                <Chip label="Đã đóng" size="small" sx={{ fontWeight: 600 }} />
                                            ) : hasUnread ? (
                                                <Chip label={`${getManagementUnreadCount(row)} tin nhắn mới`} size="small" color="error" sx={{ fontWeight: 600 }} />
                                            ) : row.lastMessage?.senderType === MessageSenderRole.CUSTOMER ? (
                                                <WaitTimerChip startTime={row.lastMessage.createdAt} />
                                            ) : (
                                                <Chip label={STATUS_LABELS[row.status] || row.status} size="small" sx={{ fontWeight: 600 }} />
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {dayjs(row.updatedAt).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                        </TableCell>

                                        <TableCell align="right">
                                            <IconButton onClick={(e) => { e.stopPropagation(); onSelectConversation(row.id); }}>
                                                <Icon icon="solar:alt-arrow-right-line-duotone" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
                </>
            )}
        </Card>
    );
};
