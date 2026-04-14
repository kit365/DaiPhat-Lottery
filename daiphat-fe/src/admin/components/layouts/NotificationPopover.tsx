import { useState } from "react";
import {
    Box,
    Badge,
    IconButton,
    Typography,
    Divider,
    List,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Button,
    Drawer,
    Stack,
    Tabs,
    Tab,
    Tooltip
} from "@mui/material";
import { Icon } from "@iconify/react";
import {
    useNotifications,
    useMarkAsRead,
    useMarkAllAsRead,
    useArchiveAllNotifications,
} from "../../hooks/useNotification";
import { useStaffTasks, useUpdateTicketServiceOrderStatus } from "../../pages/ticket-service-order/hooks/useTicketServiceOrderManagement";
import { confirmAction } from "../../utils/swal";
import { useAuthStore } from "../../../stores/useAuthStore";
import { ROUTES, prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { Card, Avatar } from "@mui/material"; // Removed duplicate Tooltip here
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/vi';
import { useNavigate } from "react-router-dom";

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const NotificationPopover = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState("all");
    const { user } = useAuthStore();

    // Fetch in-progress tasks
    const { data: staffTasksRes, refetch: refetchTasks } = useStaffTasks({
        status: "in-progress",
        noLimit: true
    });
    const { mutate: updateStatus } = useUpdateTicketServiceOrderStatus();

    const inProgressTasks = (staffTasksRes?.data || []).map((task: any) => {
        // Find which userTicket the current staff is assigned to in this ticketServiceOrder
        const assignedUserTicketMapping = task.userTicketStaffMap?.find((m: any) =>
            (m.staffId === user?.id || m.staffId?._id === user?.id) && m.status === 'in-progress'
        );
        return assignedUserTicketMapping ? { ...task, activeUserTicketMapping: assignedUserTicketMapping } : null;
    }).filter(Boolean);

    const { data: res } = useNotifications();
    const { mutate: markAsRead } = useMarkAsRead();
    const { mutate: markAllAsRead } = useMarkAllAsRead();
    const { mutate: archiveAllNotifications } = useArchiveAllNotifications();

    const allNotifications = res?.data || [];
    // Only show non-archived notifications in All/Unread
    const activeNotifications = allNotifications.filter((n: any) => n.status !== 'archived');
    const unreadNotifications = allNotifications.filter((n: any) => n.status === 'unread');
    const archivedNotifications = allNotifications.filter((n: any) => n.status === 'archived');

    let displayNotifications = [];
    if (tab === "all") displayNotifications = activeNotifications;
    else if (tab === "unread") displayNotifications = unreadNotifications;
    else displayNotifications = archivedNotifications;

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleClickItem = (item: any) => {
        if (item.status === 'unread') {
            markAsRead(item._id);
        }
        // Ưu tiên navigate theo ticketServiceOrderId trong metadata
        if (item.metadata?.ticketServiceOrderId) {
            navigate(`${ROUTES.ADMIN.TICKET_SERVICE_ORDER.EDIT}${item.metadata.ticketServiceOrderId}`);
            handleClose();
        } else if (item.link) {
            navigate(item.link);
            handleClose();
        }
    };

    const handleCompleteTask = (id: string, userTicketId: string) => {
        confirmAction("Hoàn thành dịch vụ?", "Xác nhận bạn đã hoàn thành dịch vụ cho bé này.", () => {
            updateStatus({ id, status: "completed", userTicketId }, {
                onSuccess: () => {
                    toast.success("Đã hoàn thành dịch vụ!");
                    refetchTasks();
                },
                onError: (err: any) => toast.error(err.response?.data?.message || "Lỗi khi cập nhật")
            });
        }, "success");
    };

    return (
        <>
            <IconButton
                onClick={handleOpen}
                sx={{
                    width: 40,
                    height: 40,
                    color: isOpen ? 'primary.main' : 'var(--palette-action-active)',
                    bgcolor: isOpen ? 'rgba(145, 158, 171, 0.08)' : 'transparent',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                        bgcolor: 'rgba(145, 158, 171, 0.08)',
                        transform: 'scale(1.04)'
                    }
                }}
            >
                <Badge badgeContent={unreadNotifications.length} color="error">
                    <Icon icon="solar:bell-bing-bold-duotone" width={24} />
                </Badge>
            </IconButton>

            <Drawer
                anchor="right"
                open={isOpen}
                onClose={handleClose}
                slotProps={{
                    backdrop: {
                        sx: {
                            backgroundColor: 'transparent',
                        }
                    },
                    paper: {
                        className: 'background-popup',
                        sx: {
                            width: { xs: 1, sm: 420 },
                            display: 'flex',
                            flexDirection: 'column',
                            padding: 0,
                        }
                    }
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: 68,
                        py: 2,
                        px: 2.5
                    }}
                >
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                color: 'var(--palette-text-primary)'
                            }}
                        >
                            Thông báo
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Đánh dấu tất cả là đã đọc">
                            <IconButton
                                sx={{ color: 'var(--palette-primary-main)' }}
                                onClick={() => markAllAsRead()}
                            >
                                <Icon icon="eva:done-all-fill" width={20} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Lưu trữ tất cả">
                            <IconButton
                                sx={{ color: 'text.secondary' }}
                                onClick={() => archiveAllNotifications()}
                            >
                                <Icon icon="solar:archive-bold-duotone" width={20} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Đóng">
                            <IconButton onClick={handleClose}>
                                <Icon icon="mingcute:close-line" width={20} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                {/* IN-PROGRESS TASKS SECTION */}
                {inProgressTasks.length > 0 && (
                    <Box sx={{ p: 2, bgcolor: 'var(--palette-warning-lighter)', borderBottom: '1px solid var(--palette-divider)' }}>
                        <Typography variant="overline" sx={{ color: 'var(--palette-warning-darker)', fontWeight: 800, mb: 1.5, display: 'block', fontSize: '10px' }}>
                            🚀 CÔNG VIỆC HIỆN TẠI ({inProgressTasks.length})
                        </Typography>
                        <Stack spacing={1}>
                            {inProgressTasks.map((task: any) => (
                                <Card key={task._id} variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'background.paper', border: '1px solid var(--palette-warning-light)', boxShadow: 'var(--customShadows-z1)' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Badge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            badgeContent={<Icon icon="solar:play-bold" width={8} style={{ color: 'white' }} />}
                                            sx={{ '& .MuiBadge-badge': { bgcolor: 'var(--palette-warning-main)', width: 14, height: 14, minWidth: 14, border: '2px solid white' } }}
                                        >
                                            <Avatar src={task.activeUserTicketMapping.userTicketId?.avatar} sx={{ width: 40, height: 40 }} />
                                        </Badge>
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                {task.activeUserTicketMapping.userTicketId?.name} — {task.ticketServiceId?.name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                                #{task.code}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title="Hoàn thành">
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'var(--palette-success-lighter)',
                                                        color: 'var(--palette-success-dark)',
                                                        '&:hover': { bgcolor: 'var(--palette-success-light)' }
                                                    }}
                                                    onClick={(e) => { e.stopPropagation(); handleCompleteTask(task._id, task.activeUserTicketMapping.userTicketId?._id); }}
                                                >
                                                    <Icon icon="solar:check-circle-bold" width={18} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xem">
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'var(--palette-info-lighter)',
                                                        color: 'var(--palette-info-dark)',
                                                        '&:hover': { bgcolor: 'var(--palette-info-light)' }
                                                    }}
                                                    onClick={(e) => { e.stopPropagation(); navigate(`${ROUTES.ADMIN.TICKET_SERVICE_ORDER.DETAIL}${task._id}`); handleClose(); }}
                                                >
                                                    <Icon icon="solar:eye-bold" width={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>
                                </Card>
                            ))}
                        </Stack>
                    </Box>
                )}

                <Tabs
                    value={tab}
                    onChange={(_, newValue) => setTab(newValue)}
                    sx={{
                        minHeight: 48,
                        display: 'flex',
                        overflow: 'hidden',
                        bgcolor: 'var(--palette-background-neutral)',
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTabs-flexContainer': {
                            gap: 1,
                            height: '100%',
                            alignItems: 'center',
                            px: '8px'
                        }
                    }}
                >
                    <Tab
                        disableRipple
                        label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Tất cả</Typography>
                                <Box sx={{
                                    bgcolor: tab === 'all' ? '#212B36' : 'rgba(145, 158, 171, 0.16)',
                                    color: tab === 'all' ? 'white' : '#637381',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                }}>
                                    {activeNotifications.length}
                                </Box>
                            </Stack>
                        }
                        value="all"
                        sx={{
                            height: 34,
                            minHeight: 34,
                            px: '16px',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            lineHeight: 1.57143,
                            color: 'var(--palette-text-secondary)',
                            flex: '1 1 0px',
                            opacity: 1,
                            '&.Mui-selected': {
                                bgcolor: 'var(--palette-common-white)',
                                color: 'var(--palette-text-primary)',
                                fontWeight: 600,
                                boxShadow: 'var(--customShadows-z1)'
                            }
                        }}
                    />
                    <Tab
                        disableRipple
                        label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Chưa đọc</Typography>
                                <Box sx={{
                                    bgcolor: tab === 'unread' ? '#00B8D9' : 'rgba(0, 184, 217, 0.16)',
                                    color: tab === 'unread' ? 'white' : '#006C9C',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                }}>
                                    {unreadNotifications.length}
                                </Box>
                            </Stack>
                        }
                        value="unread"
                        sx={{
                            height: 34,
                            minHeight: 34,
                            px: '16px',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            lineHeight: 1.57143,
                            color: 'var(--palette-text-secondary)',
                            flex: '1 1 0px',
                            opacity: 1,
                            '&.Mui-selected': {
                                bgcolor: 'var(--palette-common-white)',
                                color: 'var(--palette-text-primary)',
                                fontWeight: 600,
                                boxShadow: 'var(--customShadows-z1)'
                            }
                        }}
                    />
                    <Tab
                        disableRipple
                        label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Lưu trữ</Typography>
                                <Box sx={{
                                    bgcolor: tab === 'archived' ? '#22C55E' : 'rgba(34, 197, 94, 0.16)',
                                    color: tab === 'archived' ? 'white' : '#118D57',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                }}>
                                    {archivedNotifications.length}
                                </Box>
                            </Stack>
                        }
                        value="archived"
                        sx={{
                            height: 34,
                            minHeight: 34,
                            px: '16px',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            lineHeight: 1.57143,
                            color: 'var(--palette-text-secondary)',
                            flex: '1 1 0px',
                            opacity: 1,
                            '&.Mui-selected': {
                                bgcolor: 'var(--palette-common-white)',
                                color: 'var(--palette-text-primary)',
                                fontWeight: 600,
                                boxShadow: 'var(--customShadows-z1)'
                            }
                        }}
                    />
                </Tabs>

                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {displayNotifications.length === 0 ? (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                            <Icon icon="solar:bell-off-bold-duotone" width={64} style={{ opacity: 0.24, marginBottom: 16 }} />
                            <Typography variant="body2" color="text.disabled">Không có thông báo nào</Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            {displayNotifications.map((item: any) => (
                                <ListItemButton
                                    key={item._id}
                                    onClick={() => handleClickItem(item)}
                                    sx={{
                                        p: '20px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        borderBottom: 'dashed 1px var(--palette-divider)',
                                        bgcolor: item.status === 'unread' ? 'rgba(145, 158, 171, 0.04)' : 'transparent',
                                        transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': { bgcolor: 'rgba(145, 158, 171, 0.08)' }
                                    }}
                                >
                                    {item.status === 'unread' && (
                                        <Box
                                            className="unread-dot"
                                            sx={{
                                                top: 26,
                                                width: 8,
                                                height: 8,
                                                right: 20,
                                                borderRadius: '50%',
                                                bgcolor: 'var(--palette-info-main)',
                                                position: 'absolute',
                                            }}
                                        />
                                    )}

                                    <ListItemAvatar
                                        sx={{
                                            flexShrink: 0,
                                            minWidth: 'auto',
                                            mr: 2
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                display: 'flex',
                                                borderRadius: '50%',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'var(--palette-background-neutral)',
                                            }}
                                        >
                                            <Icon
                                                icon={
                                                    item.type === 'overrun' ? "solar:danger-bold-duotone" :
                                                        item.type === 'ticketServiceOrder' ? "solar:calendar-mark-bold-duotone" :
                                                            item.type === 'boarding' ? "solar:home-bold-duotone" :
                                                                "solar:bell-bold-duotone"
                                                }
                                                width={24}
                                                color={item.type === 'overrun' ? "#FF5630" :
                                                    item.type === 'boarding' ? "#FFAB00" : "#00B8D9"}
                                            />
                                        </Box>
                                    </ListItemAvatar>
                                    <ListItemText
                                        sx={{ m: 0 }}
                                        primary={
                                            <Box sx={{
                                                fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                fontWeight: 400,
                                                fontSize: '0.875rem',
                                                lineHeight: 1.57143,
                                                mb: 0.5,
                                                pr: 2
                                            }}>
                                                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{item.title}</Box>
                                                {" "}
                                                <Box component="span" sx={{ color: 'text.secondary' }}>{item.content}</Box>
                                            </Box>
                                        }
                                        secondary={
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                    {dayjs(item.createdAt).fromNow()}
                                                </Typography>
                                                <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                    {item.type === 'order' ? 'Đơn hàng' :
                                                        item.type === 'ticketServiceOrder' ? 'Dịch vụ' :
                                                            item.type === 'boarding' ? 'Khách sạn' :
                                                                item.type === 'overrun' ? 'Hệ thống' : 'Thông báo'}
                                                </Typography>
                                            </Stack>
                                        }
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </Box>

                <Divider />

                <Box sx={{ p: 1 }}>
                    <Button
                        fullWidth
                        size="large"
                        color="inherit"
                        onClick={() => {
                            navigate(ROUTES.ADMIN.NOTIFICATIONS);
                            handleClose();
                        }}
                        sx={{
                            fontFamily: '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            minHeight: 48,
                        }}
                    >
                        Xem tất cả
                    </Button>
                </Box>
            </Drawer>
        </>
    );
};
