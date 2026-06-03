import { useTranslation } from "react-i18next";
import { useState, useEffect, memo } from "react";
import { ListItemIcon, Collapse, ButtonBase, Popover, Paper } from '@mui/material';
import { Link, useLocation } from "react-router-dom";
import { ArrowIcon } from "../../../assets/icons";
import { useSidebar } from "../../../context/sidebar/useSidebar";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { USER_ROLES } from "../../../../constants/role.constants";


const SubNavItem = ({ child, isSubActive, t }: any) => {
    return (
        <li key={child.id} className="relative list-none">
            <Link
                to={child.path}
                className={`sidebar-item-before rounded-[8px] inline-flex items-center py-[4px] pr-[8px] pl-[12px] w-full min-h-[36px] text-[0.875rem] transition-all duration-200
                    ${isSubActive 
                        ? 'text-[#00A76F] font-[600] bg-[#00a76f14]' 
                        : 'text-[#637381] hover:bg-[#919eab14] hover:text-[#1C252E]'}`}
            >
                {t(child.tKey || child.label)}
            </Link>
        </li>
    );
};

export const NavItem = memo(({ item }: { item: any }) => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const { isOpen } = useSidebar();
    const { user } = useAuthStore();

    const roleCode = user?.role?.code || "";
    const isAdmin = roleCode === USER_ROLES.ADMIN;
    const isStaff = roleCode.includes('STAFF');

    const filteredChildren = (item.children || []).filter((child: any) => {
        if (child.hidden) return false;
        if (isStaff && child.hideIfStaff) return false;
        return isAdmin || !child.permission || user?.permissions?.includes(child.permission);
    });



    const hasChildren = filteredChildren.length > 0;

    const isChildActive = hasChildren ? filteredChildren.some((c: any) => pathname === c.path) : false;
    const isActive = pathname === item.path;

    const isParentHighlighted = isActive || isChildActive;

    const [open, setOpen] = useState(isChildActive);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    useEffect(() => {
        if (isChildActive) setOpen(true);
    }, [isChildActive]);

    const handleToggle = () => {
        if (isOpen) {
            setOpen(!open);
        }
    };

    const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!isOpen && hasChildren) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handleMouseLeave = () => {
        setAnchorEl(null);
    };

    const Icon = item.Icon;

    return (
        <li className="inline-block w-full" style={{ listStyle: 'none' }}>
            <ButtonBase
                {...(!hasChildren && { component: Link, to: item.path })}
                onClick={hasChildren ? handleToggle : undefined}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                sx={{
                    padding: isOpen ? "4px 8px 4px 12px" : "8px 4px 6px",
                    width: "100%",
                    minHeight: isOpen ? "44px" : "58px",
                    borderRadius: "8px",
                    color: isParentHighlighted ? "#00A76F" : "#637381",
                    bgcolor: isParentHighlighted ? "#00a76f14" : "transparent",
                    flexDirection: isOpen ? "row" : "column",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isOpen ? "flex-start" : "center",
                    gap: isOpen ? "0" : "6px",

                    '&:hover': {
                        bgcolor: isParentHighlighted ? "#00a76f26" : "#919eab14",
                    },

                    fontWeight: isParentHighlighted ? 600 : 500,
                }}
            >
                {Icon && (
                    <ListItemIcon sx={{
                        color: 'inherit',
                        mr: isOpen ? "12px" : "0",
                        minWidth: "24px",
                        '& svg': { width: 22, height: 22 }
                    }}>
                        <Icon />
                    </ListItemIcon>
                )}

                {isOpen && <span className="flex-1 text-[0.875rem] text-left">{t(item.tKey || item.label)}</span>}
                {!isOpen && <span className="text-[0.625rem] font-[600] text-center" style={{ wordBreak: 'break-word', maxWidth: '60px', lineHeight: '1.2' }}>{t(item.tKey || item.label)}</span>}

                {hasChildren && isOpen && (
                    <ArrowIcon
                        sx={{
                            fontSize: "1rem",
                            transition: "transform 200ms",
                            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                            opacity: isParentHighlighted ? 1 : 0.8,
                            color: 'inherit'
                        }}
                    />
                )}
            </ButtonBase>

            {/* Submenu popup khi collapse */}
            {hasChildren && (
                <Popover
                    open={Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    onClose={handleMouseLeave}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    onMouseLeave={handleMouseLeave}
                    sx={{
                        pointerEvents: 'none',
                        '& .MuiPopover-paper': {
                            pointerEvents: 'auto',
                            boxShadow: "none",
                        }
                    }}
                    disableRestoreFocus
                >
                    <div onMouseEnter={() => setAnchorEl(anchorEl)}
                        onMouseLeave={handleMouseLeave}
                        style={{ paddingLeft: "8px", marginLeft: "-5px", backgroundColor: "#fff", boxShadow: "none" }}>
                        <Paper
                            sx={{
                                p: "4px",
                                backgroundImage: "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCkiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzOCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMjAgMS44MTgxMmUtMDUpIHJvdGF0ZSgtNDUpIHNjYWxlKDEyMy4yNSkiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBCOEQ5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwQjhEOSIgc3RvcC1vcGFjaXR5PSIwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==), url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9yYWRpYWxfNDQ2NF81NTMzNykiIGZpbGwtb3BhY2l0eT0iMC4xIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfNDQ2NF81NTMzNyIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEyMCkgcm90YXRlKDEzNSkgc2NhbGUoMTIzLjI1KSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjU2MzAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY1NjMwIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9yYWRpYWxHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K)",
                                backdropFilter: "blur(20px)",
                                width: "192px",
                                backgroundColor: "#ffffff",
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "50%, 50%",
                                backgroundPosition: "right top, left bottom",
                                boxShadow: "0 0 2px 0 rgba(145 158 171 / 24%), -20px 20px 40px -4px rgba(145 158 171 / 24%)",
                                borderRadius: "10px",
                            }}>
                            <ul className="flex flex-col gap-[4px] m-0 p-0 list-none">
                                {filteredChildren
                                    .filter((child: any) => !child.hidden)
                                    .map((child: any) => (
                                        <SubNavItem 
                                            key={child.id} 
                                            child={child} 
                                            isSubActive={pathname.startsWith(child.path)} 
                                            t={t} 
                                        />
                                    ))}
                            </ul>
                        </Paper>
                    </div>
                </Popover>
            )}

            {/* Submenu collapse khi open */}
            {hasChildren && isOpen && (
                <Collapse in={open} timeout="auto" unmountOnExit sx={{ pl: "24px" }}>
                    <ul className="relative pl-[12px] pt-[4px] flex flex-col gap-[4px] before:absolute before:top-0 before:left-0 before:bottom-[20px] before:w-[2px] before:content-[''] before:bg-[#EDEFF2] m-0 p-0 list-none">
                        {filteredChildren
                            .filter((child: any) => !child.hidden)
                            .map((child: any) => (
                                <SubNavItem 
                                    key={child.id} 
                                    child={child} 
                                    isSubActive={pathname.startsWith(child.path)} 
                                    t={t} 
                                />
                            ))}
                    </ul>
                </Collapse>
            )}
        </li>
    );
});
