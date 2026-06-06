import { useEffect, useMemo, useRef, useState } from "react";
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
    Button
} from "@mui/material";
import { Icon } from "@iconify/react";
import {
    useNotifications,
    useMarkAsRead,
    useDeleteNotification,
    useMarkAllAsRead,
    useDeleteAllNotifications
} from "../../hooks/useNotification";
import { confirmAction } from "../../utils/swal";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/vi';
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const NotificationListPage = () => {
    const [tab, setTab] = useState("all");
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const {
        notifications,
        totalCount,
        unreadCount,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useNotifications({ limit: 5 });
    const { mutate: markAsRead } = useMarkAsRead();
    const { mutate: deleteNotification } = useDeleteNotification();
    const { mutate: markAllAsRead } = useMarkAllAsRead();
    const { mutate: deleteAllNotifications } = useDeleteAllNotifications();

    const unreadNotifications = useMemo(
        () => notifications.filter((n: any) => n.status === 'unread'),
        [notifications]
    );
    const displayNotifications = tab === "unread" ? unreadNotifications : notifications;

    useEffect(() => {
        const root = scrollContainerRef.current;
        const target = loadMoreRef.current;

        if (!root || !target || !hasNextPage) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;

                if (entry?.isIntersecting && !isFetchingNextPage) {
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
    }, [fetchNextPage, hasNextPage, isFetchingNextPage, tab, displayNotifications.length]);

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Thông báo" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Cài đặt hệ thống", to: "/admin/notifications" },
                            { label: "Thông báo" }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Button
                        onClick={() => {
                            confirmAction("Xóa tất cả thông báo đã đọc?", "Hành động này sẽ xóa các thông báo đã đọc khỏi danh sách.", () => {
                                deleteAllNotifications();
                            }, "warning");
                        }}
                        sx={{
                            background: 'rgba(255, 86, 48, 0.12)',
                            color: 'var(--palette-error-main)',
                            minHeight: "2.25rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            px: 2,
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: 'rgba(255, 86, 48, 0.24)',
                            }
                        }}
                        variant="contained"
                        startIcon={<Icon icon="solar:trash-bin-trash-bold" />}
                    >
                        Xóa đã đọc
                    </Button>
                    <Button
                        onClick={() => markAllAsRead()}
                        sx={{
                            background: 'rgba(0, 184, 217, 0.16)',
                            color: 'var(--palette-info-main)',
                            minHeight: "2.25rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            px: 2,
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: 'rgba(0, 184, 217, 0.24)',
                            }
                        }}
                        variant="contained"
                        startIcon={<Icon icon="eva:done-all-fill" />}
                    >
                        Đánh dấu đã đọc tất cả
                    </Button>
                </div>
            </div>

            <Card sx={{ p: 0, borderRadius: 'var(--shape-borderRadius)', boxShadow: 'var(--customShadows-z8)' }}>
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
                            borderRadius: '3px'
                        }
                    }}
                >
                    <Tab
                        disableRipple
                        label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Tất cả</Typography>
                                <Box sx={{
                                    bgcolor: tab === 'all' ? '#212B36' : 'rgba(145, 158, 171, 0.16)',
                                    color: tab === 'all' ? 'white' : '#637381',
                                    px: 1, py: 0.2, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700
                                }}>
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
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Chưa đọc</Typography>
                                <Box sx={{
                                    bgcolor: tab === 'unread' ? '#00B8D9' : 'rgba(0, 184, 217, 0.16)',
                                    color: tab === 'unread' ? 'white' : '#006C9C',
                                    px: 1, py: 0.2, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700
                                }}>
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
                        <Typography variant="body2" color="text.secondary">Đang tải dữ liệu...</Typography>
                    </Box>
                ) : displayNotifications.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Icon icon="solar:bell-off-bold-duotone" width={64} style={{ opacity: 0.24, marginBottom: 16 }} />
                        <Typography variant="body2" color="text.disabled">Không có thông báo nào</Typography>
                    </Box>
                ) : (
                    <Box
                        ref={scrollContainerRef}
                        sx={{
                            maxHeight: '680px',
                            overflowY: 'auto',
                        }}
                    >
                    <List disablePadding>
                        {displayNotifications.map((item: any) => (
                            <ListItem
                                key={item._id}
                                sx={{
                                    py: 2.5,
                                    px: 3,
                                    borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
                                    bgcolor: item.status === 'unread' ? 'rgba(0, 184, 217, 0.04)' : 'transparent',
                                    opacity: item.status === 'read' ? 0.65 : 1,
                                    transition: 'background-color 0.2s',
                                    '&:hover': {
                                        bgcolor: 'rgba(145, 158, 171, 0.08)',
                                        '& .item-actions': { opacity: 1 }
                                    }
                                }}
                            >
                                <ListItemAvatar sx={{ mr: 2 }}>
                                    <Avatar
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            bgcolor: item.type === 'overrun' ? 'rgba(255, 86, 48, 0.12)' :
                                                item.type === 'ticketServiceOrder' ? 'rgba(0, 184, 217, 0.12)' : 'rgba(145, 158, 171, 0.12)'
                                        }}
                                    >
                                        <Icon
                                            icon={
                                                item.type === 'overrun' ? "solar:danger-bold-duotone" :
                                                    item.type === 'ticketServiceOrder' ? "solar:calendar-mark-bold-duotone" :
                                                        "solar:bell-bold-duotone"
                                            }
                                            width={24}
                                            color={item.type === 'overrun' ? "#FF5630" : "#00B8D9"}
                                        />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" sx={{ fontWeight: item.status === 'unread' ? 700 : 600, color: 'text.primary' }}>
                                            {item.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1, lineHeight: 1.5 }}>
                                                {item.content}
                                            </Typography>
                                            <Stack direction="row" spacing={2}>
                                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
                                                    <Icon icon="solar:clock-circle-outline" width={14} />
                                                    <Typography variant="caption">{dayjs(item.createdAt).fromNow()}</Typography>
                                                </Stack>
                                                <Box component="span" sx={{ color: 'text.disabled', fontSize: '10px' }}>•</Box>
                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                    {item.type === 'order' ? 'Đơn hàng' :
                                                        item.type === 'ticketServiceOrder' ? 'Dịch vụ' :
                                                            item.type === 'boarding' ? 'Đặt phòng' :
                                                                item.type === 'overrun' ? 'Hệ thống' : 'Thông báo'}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    }
                                />
                                <Stack direction="row" spacing={1} className="item-actions" sx={{ opacity: 0.4, transition: 'opacity 0.2s', ml: 2 }}>
                                    {item.status === 'unread' && (
                                        <Tooltip title="Đã đọc">
                                            <IconButton size="small" sx={{ color: 'var(--palette-info-main)', bgcolor: 'rgba(0, 184, 217, 0.08)' }} onClick={() => markAsRead(item._id)}>
                                                <Icon icon="eva:checkmark-fill" width={20} />
                                            </IconButton>
                                        </Tooltip>
                                    )}

                                    {item.status === 'read' && (
                                        <Tooltip title="Xóa">
                                            <IconButton
                                                size="small"
                                                sx={{ color: 'var(--palette-error-main)', bgcolor: 'rgba(255, 86, 48, 0.08)' }}
                                                onClick={() => {
                                                    confirmAction("Xóa thông báo đã đọc?", "Thông báo này sẽ được xóa khỏi danh sách.", () => {
                                                        deleteNotification(item._id);
                                                    }, "warning");
                                                }}
                                            >
                                                <Icon icon="solar:trash-bin-trash-bold" width={20} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </ListItem>
                        ))}
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
        </>
    );
};
