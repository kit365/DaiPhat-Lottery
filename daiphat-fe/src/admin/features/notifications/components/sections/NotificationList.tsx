"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Card,
    Typography,
    Stack,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import {
    useNotifications,
    useMarkAsRead,
    useDeleteNotification,
} from '../../hooks/useNotification';
import { confirmAction } from '../../../../utils/swal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import {
    getAdminNotificationAccentBackground,
    getAdminNotificationAccentColor,
    getAdminNotificationCategoryLabel,
    getAdminNotificationIcon,
    getAdminNotificationPath,
} from '../../utils/notification.util';
import type { AdminNotificationItem } from '../../types/notification.type';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const NotificationList = () => {
    const router = useAdminRouter();
    const [tab, setTab] = useState('all');
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const {
        notifications,
        totalCount,
        unreadCount,
        isLoading,
        isError,
        isFetchNextPageError,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useNotifications({ limit: 5 });
    const { mutate: markAsRead } = useMarkAsRead();
    const { mutate: deleteNotification } = useDeleteNotification();

    const unreadNotifications = useMemo(
        () => notifications.filter((n) => n.status === 'unread'),
        [notifications]
    );
    const displayNotifications = tab === 'unread' ? unreadNotifications : notifications;

    useEffect(() => {
        const root = scrollContainerRef.current;
        const target = loadMoreRef.current;

        if (!root || !target || !hasNextPage || isError || isFetchNextPageError) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;

                if (entry?.isIntersecting && !isFetchingNextPage && !isFetchNextPageError && !isError) {
                    fetchNextPage();
                }
            },
            {
                root,
                rootMargin: '160px 0px',
                threshold: 0.1,
            }
        );

        observer.observe(target);

        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage, isError, isFetchNextPageError, tab, displayNotifications.length]);

    const handleOpen = (item: AdminNotificationItem) => {
        if (item.status === 'unread') {
            markAsRead(item._id);
        }
        const path = getAdminNotificationPath(item);
        if (path) {
            router.push(path);
        }
    };

    return (
        <Card
            className="admin-datagrid-card"
            sx={{ p: 0, borderRadius: 'var(--shape-borderRadius)', boxShadow: 'var(--customShadows-z8)' }}
        >
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    px: 2,
                    minHeight: 48,
                    bgcolor: 'var(--palette-background-neutral)',
                    borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--palette-text-primary)',
                        height: 3,
                        borderRadius: '3px',
                    },
                }}
            >
                <Tab
                    disableRipple
                    label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Tất cả
                            </Typography>
                            <Box
                                sx={{
                                    bgcolor: tab === 'all' ? '#212B36' : 'rgba(145, 158, 171, 0.16)',
                                    color: tab === 'all' ? 'white' : '#637381',
                                    px: 1,
                                    py: 0.2,
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                }}
                            >
                                {totalCount}
                            </Box>
                        </Stack>
                    }
                    value="all"
                    sx={{ textTransform: 'none', minHeight: 48, minWidth: 100 }}
                />
                <Tab
                    disableRipple
                    label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Chưa đọc
                            </Typography>
                            <Box
                                sx={{
                                    bgcolor: tab === 'unread' ? '#00B8D9' : 'rgba(0, 184, 217, 0.16)',
                                    color: tab === 'unread' ? 'white' : '#006C9C',
                                    px: 1,
                                    py: 0.2,
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                }}
                            >
                                {unreadCount}
                            </Box>
                        </Stack>
                    }
                    value="unread"
                    sx={{ textTransform: 'none', minHeight: 48, minWidth: 100 }}
                />
            </Tabs>

            {isLoading ? (
                <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Đang tải dữ liệu...
                    </Typography>
                </Box>
            ) : displayNotifications.length === 0 ? (
                <Box className="admin-datagrid-empty" sx={{ py: 10, textAlign: 'center' }}>
                    <Icon
                        icon="solar:bell-off-bold-duotone"
                        width={64}
                        style={{ opacity: 0.24, marginBottom: 16 }}
                    />
                    <Typography variant="body2" color="text.disabled">
                        Không có dữ liệu
                    </Typography>
                </Box>
            ) : (
                <Box
                    ref={scrollContainerRef}
                    sx={{
                        maxHeight: 640,
                        overflowY: 'auto',
                    }}
                >
                    <List disablePadding>
                        {displayNotifications.map((item) => {
                            const path = getAdminNotificationPath(item);

                            return (
                                <ListItem
                                    key={item._id}
                                    onClick={() => handleOpen(item)}
                                    sx={{
                                        py: 2.5,
                                        px: 3,
                                        borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
                                        bgcolor:
                                            item.status === 'unread'
                                                ? 'rgba(0, 184, 217, 0.04)'
                                                : 'transparent',
                                        opacity: item.status === 'read' ? 0.65 : 1,
                                        transition: 'background-color 0.2s',
                                        cursor: path || item.status === 'unread' ? 'pointer' : 'default',
                                        '&:hover': {
                                            bgcolor: 'rgba(145, 158, 171, 0.08)',
                                            '& .item-actions': { opacity: 1 },
                                        },
                                    }}
                                >
                                    <ListItemAvatar sx={{ mr: 2 }}>
                                        <Avatar
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                bgcolor: getAdminNotificationAccentBackground(item),
                                            }}
                                        >
                                            <Icon
                                                icon={getAdminNotificationIcon(item)}
                                                width={24}
                                                color={getAdminNotificationAccentColor(item)}
                                            />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: item.status === 'unread' ? 700 : 600,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {item.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mt: 0.5, mb: 1, lineHeight: 1.5 }}
                                                >
                                                    {item.content}
                                                </Typography>
                                                <Stack direction="row" spacing={2}>
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={0.5}
                                                        sx={{ color: 'text.disabled' }}
                                                    >
                                                        <Icon icon="solar:clock-circle-outline" width={14} />
                                                        <Typography variant="caption">
                                                            {dayjs(item.createdAt).fromNow()}
                                                        </Typography>
                                                    </Stack>
                                                    <Box
                                                        component="span"
                                                        sx={{ color: 'text.disabled', fontSize: '10px' }}
                                                    >
                                                        •
                                                    </Box>
                                                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                        {getAdminNotificationCategoryLabel(item)}
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        }
                                    />
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        className="item-actions"
                                        sx={{ opacity: 0.4, transition: 'opacity 0.2s', ml: 2 }}
                                    >
                                        {item.status === 'unread' && (
                                            <Tooltip title="Đã đọc">
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        color: 'var(--palette-info-main)',
                                                        bgcolor: 'rgba(0, 184, 217, 0.08)',
                                                    }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        markAsRead(item._id);
                                                    }}
                                                >
                                                    <Icon icon="eva:checkmark-fill" width={20} />
                                                </IconButton>
                                            </Tooltip>
                                        )}

                                        {item.status === 'read' && (
                                            <Tooltip title="Xóa">
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        color: 'var(--palette-error-main)',
                                                        bgcolor: 'rgba(255, 86, 48, 0.08)',
                                                    }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        confirmAction(
                                                            'Xóa thông báo đã đọc?',
                                                            'Thông báo này sẽ được xóa khỏi danh sách.',
                                                            () => {
                                                                deleteNotification(item._id);
                                                            },
                                                            'warning'
                                                        );
                                                    }}
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" width={20} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </ListItem>
                            );
                        })}
                        {hasNextPage && (
                            <Box
                                ref={loadMoreRef}
                                sx={{
                                    py: 2,
                                    textAlign: 'center',
                                    color: 'text.secondary',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Cuộn xuống để xem các thông báo trước đó
                            </Box>
                        )}
                        {isFetchingNextPage && (
                            <Box sx={{ py: 2, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Đang tải thêm thông báo...
                                </Typography>
                            </Box>
                        )}
                    </List>
                </Box>
            )}
        </Card>
    );
};
