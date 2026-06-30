import React, { useState, useRef } from 'react';
import {
    Box,
    Card,
    Tabs,
    Tab,
    styled,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Stack,
    Avatar,
    IconButton,
    Chip,
    Toolbar,
    Button,
    Tooltip,
    SvgIcon,
    Menu,
    MenuItem,
    Badge
} from "@mui/material";
import { Icon } from "@iconify/react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { Search } from "../../../components/ui/Search";
import { SortButton } from "../../../components/ui/SortButton";
import { SettingsList } from "../../../components/ui/SettingsList";
import { Conversation } from '../types/chat';

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

const CustomViewColumnIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path fill="#1C252E" fillRule="evenodd" d="M15 4H9v16h6zm2 16h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3zM4 4h3v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" clipRule="evenodd" />
    </SvgIcon>
);

const CustomExportIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <g fill="none" fillRule="evenodd">
            <path fill="#1C252E" d="M12 1.25a.75.75 0 0 0-.75.75v10.973l-1.68-1.961a.75.75 0 1 0-1.14.976l3 3.5a.75.75 0 0 0 1.14 0l3-3.5a.75.75 0 1 0-1.14-.976l-1.68 1.96V2a.75.75 0 0 0-.75-.75" />
            <path fill="#1C252E" d="M14.25 9v.378a2.249 2.249 0 0 1 2.458 3.586l-3 3.5a2.25 2.25 0 0 1-3.416 0l-3-3.5A2.25 2.25 0 0 1 9.75 9.378V9H8c-2.828 0-4.243 0-5.121.879C2 10.757 2 12.172 2 15v1c0 2.828 0 4.243.879 5.121C3.757 22 5.172 22 8 22h8c2.828 0 4.243 0 5.121-.879C22 20.243 22 18.828 22 16v-1c0-2.828 0-4.243-.879-5.121C20.243 9 18.828 9 16 9z" />
        </g>
    </SvgIcon>
);

const DummyColumns = () => {
    return (
        <Tooltip title="Cột">
            <Button
                variant="text"
                size="small"
                disableElevation
                startIcon={<CustomViewColumnIcon />}
                onClick={() => toast.info("Đã bật chế độ xem toàn bộ cột mặc định")}
                sx={{
                    textTransform: 'none',
                    minWidth: '64px',
                    minHeight: "30px",
                    fontSize: "0.8125rem",
                    padding: '4px',
                    fontWeight: "700",
                    borderRadius: "8px",
                    gap: "6px",
                    color: '#1C252E',
                    '& .MuiButton-startIcon': { margin: 0 },
                    '&:hover': { backgroundColor: '#919eab14' },
                    '& .MuiButton-icon': { mt: "-2px !important" }
                }}
            >
                Cột
            </Button>
        </Tooltip>
    );
};

const DummyExportButton = () => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <Tooltip title="Tải dữ liệu">
                <Button
                    ref={anchorRef}
                    variant="text"
                    size="small"
                    disableElevation
                    startIcon={<CustomExportIcon sx={{ fontSize: '1.125rem !important' }} />}
                    onClick={() => setOpen(true)}
                    sx={{
                        textTransform: 'none',
                        minWidth: '64px',
                        minHeight: '30px',
                        fontSize: '0.8125rem',
                        padding: '4px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        gap: '6px',
                        color: '#1C252E',
                        '& .MuiButton-startIcon': { margin: 0 },
                        '&:hover': { backgroundColor: '#919eab14' },
                        '& .MuiButton-icon': { mt: "-2px !important" }
                    }}
                >
                    Tải về
                </Button>
            </Tooltip>
            <Menu
                anchorEl={anchorRef.current}
                open={open}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={() => { setOpen(false); toast.success("Đang chuẩn bị trang in..."); }}>In</MenuItem>
                <MenuItem onClick={() => { setOpen(false); toast.success("Đang xuất file CSV..."); }}>Tải xuống (CSV)</MenuItem>
            </Menu>
        </>
    );
};

interface ChatListProps {
    conversations: Conversation[];
    onSelectConversation: (id: string) => void;
}

export const ChatList = ({ conversations, onSelectConversation }: ChatListProps) => {
    const [tabStatus, setTabStatus] = useState('all');
    const [selected, setSelected] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortByUI, setSortByUI] = useState('newest');
    
    // Dummy settings for SettingsList
    const [settings, setSettings] = useState({ density: 'medium', striped: false, bordered: false });

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setTabStatus(newValue);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelecteds = conversations.map((n) => n._id);
            setSelected(newSelecteds);
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
        if (tabStatus === 'unread' && conv.unreadCount === 0) return false;
        if (searchQuery) {
            const participantName = conv.participants[0]?.fullName?.toLowerCase() || '';
            if (!participantName.includes(searchQuery.toLowerCase())) return false;
        }
        return true;
    });

    const statusCounts = {
        all: conversations.length,
        unread: conversations.filter(c => c.unreadCount > 0).length,
    };

    const sortOptions = [
        { value: 'newest', label: "Mới nhất" },
        { value: 'oldest', label: "Cũ nhất" }
    ];

    return (
        <Card sx={{
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
                    <Button
                        variant="text"
                        size="small"
                        disableElevation
                        startIcon={
                            <Badge
                                badgeContent={0}
                                color="primary"
                                variant="dot"
                                sx={{ '& .MuiBadge-badge': { backgroundColor: "#FF5630" } }}
                            >
                                <SvgIcon sx={{ fontSize: '1.125rem !important' }} viewBox="0 0 24 24">
                                    <g fill="none" fillRule="evenodd">
                                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                        <path fill="#1C252E" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z" />
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
                            color: '#1C252E',
                            '& .MuiButton-startIcon': { margin: 0 },
                            '&:hover': { backgroundColor: '#919eab14' },
                            '& .MuiButton-icon': { mt: "-2px !important" }
                        }}
                    >
                        Bộ lọc
                    </Button>
                    <SortButton
                        options={sortOptions}
                        value={sortByUI}
                        onChange={setSortByUI}
                    />
                    <DummyColumns />
                    <DummyExportButton />
                    <SettingsList
                        settings={settings as any}
                        onSettingsChange={setSettings as any}
                    />
                </Box>
            </Toolbar>

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
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Trạng thái</TableCell>
                            <TableCell sx={{ borderBottom: 'none', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Cập nhật lúc</TableCell>
                            <TableCell sx={{ borderBottom: 'none', width: 80 }} align="right" />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {filteredConversations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                    <Typography sx={{ color: 'var(--palette-text-secondary)' }}>
                                        Không có dữ liệu
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredConversations.map((row: Conversation) => {
                                const isItemSelected = selected.indexOf(row._id) !== -1;
                                const participant = row.participants[0];
                                const hasUnread = row.unreadCount > 0;

                                return (
                                    <TableRow
                                        hover
                                        key={row._id}
                                        selected={isItemSelected}
                                        sx={{ 
                                            cursor: 'pointer',
                                            bgcolor: hasUnread ? 'var(--palette-action-hover)' : 'inherit'
                                        }}
                                        onClick={() => onSelectConversation(row._id)}
                                    >
                                        <TableCell padding="checkbox" sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isItemSelected}
                                                onChange={(e) => handleClick(e, row._id)}
                                                sx={{ color: 'var(--palette-text-disabled)', p: 0 }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Avatar src={participant?.avatar} sx={{ width: 40, height: 40 }} />
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: hasUnread ? 700 : 600 }}>
                                                        {participant?.fullName || 'Khách hàng ẩn danh'}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {participant?.phone || participant?.email || 'N/A'}
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
                                                {row.lastMessage?.content || 'Chưa có tin nhắn...'}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            {hasUnread ? (
                                                <Chip label={`${row.unreadCount} tin nhắn mới`} size="small" color="error" sx={{ fontWeight: 600 }} />
                                            ) : (
                                                <Chip label="Đã đọc" size="small" sx={{ bgcolor: 'var(--palette-success-lighter)', color: 'var(--palette-success-dark)', fontWeight: 600 }} />
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {dayjs(row.updatedAt).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                        </TableCell>

                                        <TableCell align="right">
                                            <IconButton onClick={(e) => { e.stopPropagation(); onSelectConversation(row._id); }}>
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
        </Card>
    );
};
