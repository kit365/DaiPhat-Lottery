import AppBar from "@mui/material/AppBar";
import useScrollTrigger from '@mui/material/useScrollTrigger';
import React from "react";
import Container from "@mui/material/Container";
import Box from '@mui/material/Box';
import SettingsIcon from '@mui/icons-material/Settings';
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from 'react-toastify';
import { useAuthStore } from "../../../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { authService } from "../../pages/authen/services/auth.service";
import { ROUTES, prefixAdmin } from "../../constants/routes";
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
            backgroundColor: trigger ? "rgba(255, 255, 255, 0.8)" : "transparent",
            backdropFilter: trigger ? "blur(8px)" : "none",
            boxShadow: trigger ? "0 0 2px 0 rgba(145 158 171 / 24%), -20px 20px 40px -4px rgba(145 158 171 / 24%)" : "none",
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
    });
}

export const Header = () => {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, logout: logoutStore } = useAuthStore();
    const [anchorElLang, setAnchorElLang] = useState<HTMLButtonElement | null>(null);
    const [anchorElUser, setAnchorElUser] = useState<HTMLButtonElement | null>(null);

    const handleOpenLang = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorElLang(event.currentTarget);
    };

    const handleCloseLang = () => {
        setAnchorElLang(null);
    };

    const handleOpenUser = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUser = () => {
        setAnchorElUser(null);
    };

    const handleLogout = async () => {
        try {
            // Clear local state immediately for better UX
            logoutStore();
            Cookies.remove(STORAGE_KEYS.TOKEN_ADMIN, { path: '/' });
            Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });
            toast.success("Đăng xuất thành công!");
            navigate(ROUTES.ADMIN.AUTH.LOGIN);

            // Attempt server-side logout (browser sends HttpOnly cookie automatically)
            await authService.logout();
        } catch (error) {
            console.error("Logout error (non-blocking):", error);
            // We don't block the UI here since local state is already cleared
        }
    };

    const handleChangeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        const message = lng === 'vi' ? 'Đã đổi sang Tiếng Việt!' : 'Language changed to English!';
        toast.success(message);
        handleCloseLang();
    };

    const openLang = Boolean(anchorElLang);
    const openUser = Boolean(anchorElUser);

    // Flags
    const VI_FLAG = "https://flagcdn.com/w40/vn.png";
    const US_FLAG = "https://flagcdn.com/w40/gb.png";

    const currentFlag = i18n.language === 'vi' ? VI_FLAG : US_FLAG;

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
                    className="flex items-center justify-between"
                    maxWidth={false}
                    style={{
                        paddingLeft: "40px",
                        paddingRight: "40px",
                        height: "72px"
                    }}
                >
                    <div className="flex items-center gap-[8px] py-[4px]">
                        <img
                            src="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/icons/workspaces/logo-1.webp"
                            width={24}
                            height={24}
                            alt="DaiPhat"
                            className="w-[24px] h-[24px] object-cover"
                        />
                        <span className="text-[0.875rem] font-[600] text-[#1c252e]">DaiPhat</span>
                    </div>
                    <Box className="flex items-center gap-[6px]">
                        <Box className="flex items-center pr-[8px] cursor-pointer bg-[#919eab14] hover:bg-[#919eab29] rounded-[12px] transition-colors duration-150 ease-in-out">
                            <Box className="p-[8px]">
                                <svg className="text-[1.25rem] text-[#637381]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" id="«ro»" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="m20.71 19.29l-3.4-3.39A7.92 7.92 0 0 0 19 11a8 8 0 1 0-8 8a7.92 7.92 0 0 0 4.9-1.69l3.39 3.4a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.42M5 11a6 6 0 1 1 6 6a6 6 0 0 1-6-6"></path></svg>
                            </Box>
                            <span className="h-[1.5rem] min-w-[1.5rem] flex items-center justify-center text-[#1C252E] text-[0.75rem] font-[900] pl-[6px] pr-[6px] rounded-[6px] bg-white box-shadow-[0_1px_2px_0_rgba(145,158,171,0.16)]"><span className="text-[0.4375rem] mt-[1px] mr-[1px]">⌘</span>K</span>
                        </Box>

                        <Button
                            onClick={handleOpenLang}
                            sx={{
                                minWidth: 0,
                                mx: "10px",
                                width: 40,
                                height: "40px",
                                padding: "0",
                                borderRadius: '50%',
                                backgroundColor: openLang ? 'rgba(145, 158, 171, 0.16)' : 'transparent',
                                '&:hover': {
                                    backgroundColor: 'rgba(145, 158, 171, 0.16)',
                                    scale: "1.04"
                                }
                            }}
                        >
                            <img
                                src={currentFlag}
                                alt="flag"
                                style={{
                                    width: 26,
                                    height: 20,
                                    borderRadius: 5,
                                    objectFit: 'cover',
                                }}
                            />
                        </Button>
                        <Popover
                            open={openLang}
                            anchorEl={anchorElLang}
                            onClose={handleCloseLang}
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
                                    className: 'background-popup',
                                    sx: {
                                        ml: 0.75,
                                        width: 168,
                                        '& .MuiMenuItem-root': {
                                            px: 1,
                                            typography: 'body2',
                                            borderRadius: 0.75,
                                        },
                                    },
                                }
                            }}
                        >
                            <MenuItem
                                selected={i18n.language === 'en'}
                                onClick={() => handleChangeLanguage('en')}
                                sx={{
                                    padding: "6px 8px",
                                    mb: "4px",
                                    fontSize: '0.8125rem !important',
                                    '&.Mui-selected': {
                                        fontWeight: 600,
                                        backgroundColor: '#919eab29 !important',
                                        '&:hover': {
                                            backgroundColor: '#919eab3d !important',
                                        }
                                    }
                                }}
                            >
                                <Box component="img" alt="en" src={US_FLAG} sx={{ width: 26, height: 20, mr: 2, borderRadius: "5px", objectFit: 'cover' }} />
                                English
                            </MenuItem>
                            <MenuItem
                                selected={i18n.language === 'vi'}
                                onClick={() => handleChangeLanguage('vi')}
                                sx={{
                                    padding: "6px 8px",
                                    mb: "4px",
                                    fontSize: '0.8125rem !important',
                                    '&.Mui-selected': {
                                        fontWeight: 600,
                                        backgroundColor: '#919eab29 !important',
                                        '&:hover': {
                                            backgroundColor: '#919eab3d !important',
                                        }
                                    }
                                }}
                            >
                                <Box component="img" alt="vi" src={VI_FLAG} sx={{ width: 26, height: 20, mr: 2, borderRadius: "5px", objectFit: 'cover' }} />
                                Tiếng Việt
                            </MenuItem>
                        </Popover>
                        <NotificationPopover />
                        <Button
                            className="hover:scale-[1.04] hover:bg-admin-hoverIcon transition-all duration-150 ease-in-out"
                            sx={{
                                minWidth: 0,
                                padding: 0,
                            }}>
                            <SettingsIcon
                                sx={{
                                    color: "#637381",
                                    fontSize: "1.375rem",
                                    animation: "spin 10s linear infinite",
                                    "@keyframes spin": {
                                        "0%": { transform: "rotate(0deg)" },
                                        "100%": { transform: "rotate(360deg)" }
                                    }
                                }}
                            />
                        </Button>
                        <Button
                            onClick={handleOpenUser}
                            sx={{
                                minWidth: 0,
                                padding: 0,
                                borderRadius: '50%',
                            }}
                        >
                            <Box 
                                className={`relative rounded-full p-[2px] w-[2.5rem] h-[2.5rem] ${openUser ? 'active' : ''}`}
                                sx={{
                                    border: '2px solid transparent',
                                    transition: 'all 0.2s',
                                    ...(openUser && {
                                        borderColor: 'var(--palette-primary-main)',
                                        transform: 'scale(1.05)'
                                    })
                                }}
                            >
                                <Avatar 
                                    className="w-full h-full" 
                                    src={user?.avatar} 
                                    sx={{ 
                                        bgcolor: 'var(--palette-primary-main)',
                                        fontSize: '0.875rem',
                                        fontWeight: 800
                                    }}
                                >
                                    {user?.fullName || user?.firstName || user?.lastName ? (
                                        `${user?.lastName?.charAt(0) || ''}${user?.firstName?.charAt(0) || user?.fullName?.charAt(0) || ''}`.toUpperCase()
                                    ) : (
                                        <Icon icon="solar:user-bold" width={20} />
                                    )}
                                </Avatar>
                            </Box>
                        </Button>

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
                                        borderRadius: '12px',
                                        overflow: 'inherit',
                                        backdropFilter: 'blur(20px)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.24), -20px 20px 40px -4px rgba(145, 158, 171, 0.24)',
                                        border: '1px solid rgba(145, 158, 171, 0.12)',
                                        '&:before': {
                                            top: -7,
                                            right: 17,
                                            width: 14,
                                            height: 14,
                                            content: '""',
                                            position: 'absolute',
                                            borderRadius: '0 0 2px 0',
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            transform: 'rotate(-135deg)',
                                            borderLeft: '1px solid rgba(145, 158, 171, 0.12)',
                                            borderTop: '1px solid rgba(145, 158, 171, 0.12)',
                                        }
                                    },
                                }
                            }}
                        >
                            <Box sx={{ py: 2, px: 2.5 }}>
                                <Typography variant="subtitle2" noWrap sx={{ color: 'var(--palette-text-primary)', fontWeight: 700, fontSize: '0.875rem' }}>
                                    {user?.fullName || user?.firstName ? `${user?.lastName || ''} ${user?.firstName || user?.fullName}` : "---"}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem', mt: 0.5 }} noWrap>
                                    {user?.email || "---"}
                                </Typography>
                            </Box>

                            <Divider sx={{ borderStyle: 'dashed', borderColor: 'var(--palette-divider)' }} />

                            <Stack sx={{ p: 1 }}>
                                <MenuItem 
                                    onClick={() => { navigate(ROUTES.ADMIN.PROFILE); handleCloseUser(); }}
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
                            </Stack>

                            <Divider sx={{ borderStyle: 'dashed', borderColor: 'var(--palette-divider)' }} />

                            <Box sx={{ p: 1 }}>
                                <MenuItem 
                                    onClick={handleLogout} 
                                    sx={{ 
                                        borderRadius: '8px',
                                        typography: 'body2',
                                        fontWeight: 700,
                                        color: 'var(--palette-error-main)',
                                        '&:hover': { bgcolor: 'var(--palette-error-lighter)' }
                                    }}
                                >
                                    <Icon icon="solar:logout-3-bold-duotone" width={20} style={{ marginRight: '12px' }} />
                                    Đăng xuất
                                </MenuItem>
                            </Box>
                        </Popover>
                    </Box>
                </Container>
            </AppBar>
        </ElevationScroll >
    )
}
