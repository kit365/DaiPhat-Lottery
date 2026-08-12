"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Button } from '@/admin/components/ui/Button';

import AppBar from "@mui/material/AppBar";
import useScrollTrigger from '@mui/material/useScrollTrigger';
import React from "react";
import Container from "@mui/material/Container";
import Box from '@mui/material/Box';
import SettingsIcon from '@mui/icons-material/Settings';
import Avatar from "@mui/material/Avatar";

import Popover from "@mui/material/Popover";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useState } from "react";
import { toast } from 'react-toastify';
import { motion } from "framer-motion";
import { useAuthStore } from "../../../stores/useAuthStore";
import { authService } from "@/admin/features/auth/services/auth.service";
import { ROUTES } from "../../constants/routes";
import { NotificationPopover } from "./NotificationPopover";
import { STORAGE_KEYS } from "../../../constants/storage.constants";
import Cookies from "js-cookie";

interface Props {
    window?: () => Window;
    children: React.ReactElement<any, any>;
    sx?: any;
}

function ElevationScroll(props: Props) {
    const { children, window, sx: extraSx } = props;

    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0,
        target: window ? window() : undefined,
    });

    return React.cloneElement(children, {
        elevation: trigger ? 4 : 0,
        className: (children.props.className || "") + (trigger ? ' header__admin scrolled' : ' header__admin'),
        sx: {
            ...children.props.sx,
            ...extraSx,
            backgroundImage: "none !important",
            backgroundColor: trigger ? "rgba(255, 255, 255, 0.7)" : "transparent",
            backdropFilter: trigger ? "blur(12px)" : "none",
            boxShadow: trigger ? "0 8px 32px 0 rgba(0, 0, 0, 0.08), 0 0 2px 0 rgba(145, 158, 171, 0.2)" : "none",
            borderBottom: trigger ? "1px solid rgba(255, 255, 255, 0.2)" : "none",
            transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
    });
}

export const Header = () => {
    const router = useAdminRouter();
    const { user, logout: logoutStore } = useAuthStore();
    const [anchorElUser, setAnchorElUser] = useState<HTMLButtonElement | null>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleOpenUser = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUser = () => {
        setAnchorElUser(null);
    };

    const handleLogout = async () => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);

        try {
            await authService.logout();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            logoutStore();
            Cookies.remove(STORAGE_KEYS.TOKEN, { path: '/' });
            Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });
            handleCloseUser();
            toast.success("Đăng xuất thành công!");
            router.replace(ROUTES.ADMIN.AUTH.LOGIN);
            setIsLoggingOut(false);
        }
    };

    const openUser = Boolean(anchorElUser);

    const navMotionProps = {
        whileHover: { 
            scale: 1.15, 
            y: -8,
            filter: 'brightness(1.15) drop-shadow(0 12px 24px rgba(0,0,0,0.15))',
        },
        transition: { type: "spring" as const, stiffness: 400, damping: 17 }
    };

    return (
        <ElevationScroll>
            <AppBar
                position="sticky"
                color="inherit"
                sx={{
                    width: "100%",
                }}
            >
                <Container
                    className="flex items-center justify-end"
                    maxWidth={false}
                    style={{
                        paddingLeft: "40px",
                        paddingRight: "40px",
                        height: "72px"
                    }}
                >
                    <Box className="flex items-center gap-[6px]">
                        <NotificationPopover 
                            onMouseEnter={() => setHoveredItem('notif')}
                            onMouseLeave={() => setHoveredItem(null)}
                            isHovered={hoveredItem === 'notif'}
                            layoutId="header-highlight"
                        />
                        <motion.div 
                            {...navMotionProps}
                            onMouseEnter={() => setHoveredItem('settings')}
                            onMouseLeave={() => setHoveredItem(null)}
                            className="relative"
                        >
                            <Button
                                sx={{
                                    minWidth: 0,
                                    width: 40,
                                    height: 40,
                                    padding: 0,
                                    borderRadius: '50%',
                                    position: 'relative',
                                    zIndex: 1
                                }}>
                                <SettingsIcon
                                    sx={{
                                        color: "#637381",
                                        fontSize: "1.25rem",
                                        animation: "spin 12s linear infinite",
                                        "@keyframes spin": {
                                            "0%": { transform: "rotate(0deg)" },
                                            "100%": { transform: "rotate(360deg)" }
                                        }
                                    }}
                                />
                            </Button>
                            {hoveredItem === 'settings' && (
                                <motion.div
                                    layoutId="header-highlight"
                                    className="absolute inset-0 bg-[#919eab14] rounded-full z-0"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                        </motion.div>
                        <motion.div 
                            {...navMotionProps}
                            onMouseEnter={() => setHoveredItem('user')}
                            onMouseLeave={() => setHoveredItem(null)}
                            className="relative"
                        >
                            <Button
                                onClick={handleOpenUser}
                                sx={{
                                    minWidth: 0,
                                    padding: 0,
                                    borderRadius: '50%',
                                    ml: 0.5,
                                    position: 'relative',
                                    zIndex: 1
                                }}
                            >
                                <Box 
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        position: 'relative',
                                        backgroundColor: openUser ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                                        boxShadow: openUser ? '0 0 0 2px var(--palette-primary-main)' : 'none',
                                    }}
                                >
                                    <Avatar 
                                        src={user?.avatar} 
                                        sx={{ 
                                            width: 32,
                                            height: 32,
                                            bgcolor: 'var(--palette-primary-main)',
                                            fontSize: '0.8125rem',
                                            fontWeight: 800,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            border: '2px solid #fff' 
                                        }}
                                    >
                                        {user?.fullName || user?.firstName || user?.lastName ? (
                                            `${user?.lastName?.charAt(0) || ''}${user?.firstName?.charAt(0) || user?.fullName?.charAt(0) || ''}`.toUpperCase()
                                        ) : (
                                            <Icon icon="solar:user-bold" width={18} />
                                        )}
                                    </Avatar>
                                </Box>
                            </Button>
                            {hoveredItem === 'user' && (
                                <motion.div
                                    layoutId="header-highlight"
                                    className="absolute inset-0 bg-[#919eab14] rounded-full z-0"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                        </motion.div>

                        <Popover
                            open={openUser}
                            anchorEl={anchorElUser}
                            onClose={handleCloseUser}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            slotProps={{
                                paper: {
                                    sx: {
                                        p: 0,
                                        mt: 1.5,
                                        ml: 0.75,
                                        width: 220,
                                        borderRadius: '16px',
                                        overflow: 'inherit',
                                        backdropFilter: 'blur(12px) saturate(160%)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.75)',
                                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        '&:before': {
                                            top: -7,
                                            right: 17,
                                            width: 14,
                                            height: 14,
                                            content: '""',
                                            position: 'absolute',
                                            borderRadius: '0 0 2px 0',
                                            backgroundColor: 'rgba(255, 255, 255, 0.65)',
                                            transform: 'rotate(-135deg)',
                                            borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                                        }
                                    },
                                }
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                <Box sx={{ py: 1.5, px: 2.5 }}>
                                    <Typography variant="subtitle2" noWrap sx={{ color: 'var(--palette-text-primary)', fontWeight: 700, fontSize: '0.875rem' }}>
                                        {user?.fullName || user?.firstName ? `${user?.lastName || ''} ${user?.firstName || user?.fullName}` : "---"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem', mt: 0.5 }} noWrap>
                                        {user?.email || "---"}
                                    </Typography>
                                </Box>
                                
                                <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(145, 158, 171, 0.24)', backgroundColor: 'transparent', borderBottomWidth: '1px', borderWidth: '0 0 1px 0' }} />

                                <Stack sx={{ p: 1 }}>
                                    <motion.div
                                        whileHover={{ x: 4, filter: 'brightness(1.05)' }}
                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    >
                                        <MenuItem 
                                            onClick={() => { router.push(ROUTES.ADMIN.PROFILE); handleCloseUser(); }}
                                            sx={{ 
                                                borderRadius: '8px',
                                                typography: 'body2',
                                                fontWeight: 500,
                                                color: 'var(--palette-text-primary)',
                                                '&:hover': { bgcolor: 'var(--palette-action-hover)' }
                                            }}
                                        >
                                            <Icon icon="solar:user-bold-duotone" width={20} style={{ marginRight: '12px', color: 'var(--palette-text-secondary)' }} />
                                            Hồ sơ cá nhân
                                        </MenuItem>
                                    </motion.div>
                                </Stack>

                                <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(145, 158, 171, 0.24)', backgroundColor: 'transparent', borderBottomWidth: '1px', borderWidth: '0 0 1px 0' }} />

                                <Box sx={{ p: 1 }}>
                                    <motion.div
                                        whileHover={{ x: 4, filter: 'brightness(1.05)' }}
                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    >
                                        <Button
                                            fullWidth
                                            variant="text"
                                            color="error"
                                            loading={isLoggingOut}
                                            loadingLabel="Đang đăng xuất..."
                                            onClick={handleLogout}
                                            startIcon={<Icon icon="solar:logout-3-bold-duotone" width={20} />}
                                            sx={{
                                                justifyContent: 'flex-start',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                color: 'var(--palette-error-main)',
                                                px: 1.5,
                                                py: 1,
                                                '&:hover': { bgcolor: 'var(--palette-error-lighter)' },
                                            }}
                                        >
                                            Đăng xuất
                                        </Button>
                                    </motion.div>
                                </Box>
                            </motion.div>
                        </Popover>
                    </Box>
                </Container>
            </AppBar>
        </ElevationScroll >
    )
}
