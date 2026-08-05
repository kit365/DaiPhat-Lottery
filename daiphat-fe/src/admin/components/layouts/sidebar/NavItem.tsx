"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect, memo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ListItemIcon, Collapse, ButtonBase, Popover, Paper, Badge } from '@mui/material';
import { Link, useLocation } from "react-router-dom";
import { ArrowIcon } from "../../../assets/icons";
import { useSidebar } from "../../../context/sidebar/useSidebar";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { hasPermission, resolveRoleCode } from "../../../utils/permission.util";
import { prefetchAdminRoute } from "../../../utils/prefetchAdminPages";
import { useRefundPendingCount } from "../../../pages/refund/hooks/useRefundPendingCount";
import { usePrizePayoutPendingCount } from "../../../pages/prize-payout/hooks/usePrizePayoutPendingCount";
import { usePreparingOrderCount } from "../../../features/orders/hooks/useOrder";
import { useSupportTicketOpenCount } from "../../../features/support-ticket/hooks/useSupportTicketOpenCount";
import { useChatWaitingCount } from "../../../features/chat/hooks/useChatWaitingCount";

import { useReturnBatchPendingCount } from "../../../features/ticket/return-batch/hooks/useReturnBatchPendingCount";

function parseNavPath(rawPath: string): { pathname: string; search: string } {
    const [pathname, query = ''] = String(rawPath || '').split('?');
    return { pathname, search: query };
}

function isNavChildActive(
    pathname: string,
    search: string,
    childPath: string,
    siblings?: { path: string }[]
): boolean {
    const target = parseNavPath(childPath);
    if (pathname !== target.pathname) {
        // If current pathname matches a sibling path exactly, this non-matching child is NOT active
        const matchesSiblingExact = (siblings || []).some((s) => {
            const sp = parseNavPath(s.path);
            return sp.pathname === pathname;
        });
        if (matchesSiblingExact) {
            return false;
        }

        // Highlight list child when viewing detail under same section prefix
        if (
            !target.search &&
            target.pathname.endsWith('/list') &&
            pathname.startsWith(target.pathname.replace(/\/list$/, '/'))
        ) {
            return true;
        }
        return false;
    }

    const suffix = pathname.slice(sectionPrefix.length);
    return suffix.startsWith('detail/') || suffix.startsWith('inspect/');
}

function isNavChildActive(pathname: string, search: string, childPath: string): boolean {
    const target = parseNavPath(childPath);

    if (pathname === target.pathname) {
        if (!target.search) {
            return true;
        }
        const required = new URLSearchParams(target.search);
        const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
        return [...required.entries()].every(([key, value]) => current.get(key) === value);
    }
    const required = new URLSearchParams(target.search);
    const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    let match = true;
    required.forEach((val, key) => {
        if (current.get(key) !== val) match = false;
    });
    return match;
}

const SubNavItem = ({
    child,
    isSubActive,
    t,
    onPrefetch,
}: {
    child: any;
    isSubActive: boolean;
    t: (key: string) => string;
    onPrefetch: (path: string) => void;
}) => {
    const showSupportOpenBadge = child.badge === 'support-open';
    const showReturnBatchBadge = child.badge === 'return-batch-pending';

    return (
        <li key={child.id} className="relative list-none">
            <Link
                to={child.path}
                onMouseEnter={() => onPrefetch(child.path)}
                className={`sidebar-item-before rounded-[8px] inline-flex items-center py-[4px] pr-[8px] pl-[12px] w-full min-h-[36px] text-[0.875rem] transition-all duration-200
                    ${isSubActive
                        ? 'text-[#FF3030] font-[600] bg-[#FF303014]'
                        : 'text-[#637381] hover:bg-[#919eab14] hover:text-[#1C252E]'}`}
            >
                <span className="truncate min-w-0 flex-1">{t(child.tKey || child.label)}</span>
                {showSupportOpenBadge && (
                    <span className="ml-2 shrink-0 inline-flex items-center">
                        <SupportTicketOpenBadgeLabel />
                    </span>
                )}
                {showReturnBatchBadge && (
                    <span className="ml-2 shrink-0 inline-flex items-center">
                        <ReturnBatchPendingBadgeLabel />
                    </span>
                )}
            </Link>
        </li>
    );
};

const sidebarBadgeSx = {
    position: 'static' as const,
    transform: 'none',
    backgroundColor: '#FF5630',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.65rem',
    minWidth: 18,
    height: 18,
    borderRadius: '9px',
    px: 0.5,
};

const sidebarIconBadgeSx = {
    backgroundColor: '#FF5630',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.6rem',
    minWidth: 16,
    height: 16,
    top: 2,
    right: 2,
};

/** Isolated so only the Refund menu item polls pending counts. */
const RefundPendingBadgeLabel = () => {
    const { pendingCount } = useRefundPendingCount();
    if (pendingCount <= 0) return null;
    return (
        <Badge
            badgeContent={pendingCount > 99 ? '99+' : pendingCount}
            sx={{ '& .MuiBadge-badge': sidebarBadgeSx }}
        />
    );
};

const RefundPendingBadgeIcon = ({ children }: { children: ReactNode }) => {
    const { pendingCount } = useRefundPendingCount();
    return (
        <Badge
            badgeContent={pendingCount > 99 ? '99+' : pendingCount}
            invisible={pendingCount <= 0}
            sx={{ '& .MuiBadge-badge': sidebarIconBadgeSx }}
        >
            {children}
        </Badge>
    );
};

/** Isolated so only the Prize Payout menu item polls pending counts. */
const PrizePayoutPendingBadgeLabel = () => {
    const { pendingCount } = usePrizePayoutPendingCount();
    if (pendingCount <= 0) return null;
    return (
        <Badge
            badgeContent={pendingCount > 99 ? '99+' : pendingCount}
            sx={{ '& .MuiBadge-badge': sidebarBadgeSx }}
        />
    );
};

const PrizePayoutPendingBadgeIcon = ({ children }: { children: ReactNode }) => {
    const { pendingCount } = usePrizePayoutPendingCount();
    return (
        <Badge
            badgeContent={pendingCount > 99 ? '99+' : pendingCount}
            invisible={pendingCount <= 0}
            sx={{ '& .MuiBadge-badge': sidebarIconBadgeSx }}
        >
            {children}
        </Badge>
    );
};

/** Isolated badge for all open support tickets (complaints). */
const SupportTicketOpenBadgeLabel = () => {
    const { openCount } = useSupportTicketOpenCount();
    if (openCount <= 0) return null;
    return (
        <Badge
            badgeContent={openCount > 99 ? '99+' : openCount}
            sx={{ '& .MuiBadge-badge': sidebarBadgeSx }}
        />
    );
};

const SupportTicketOpenBadgeIcon = ({ children }: { children: ReactNode }) => {
    const { openCount } = useSupportTicketOpenCount();
    return (
        <Badge
            badgeContent={openCount > 99 ? '99+' : openCount}
            invisible={openCount <= 0}
            sx={{ '& .MuiBadge-badge': sidebarIconBadgeSx }}
        >
            {children}
        </Badge>
    );
};

/** Isolated badge for active return batches (excluding cancelled and handed over). */
const ReturnBatchPendingBadgeLabel = () => {
    const { pendingCount } = useReturnBatchPendingCount();
    if (pendingCount <= 0) return null;
    return (
        <Badge
            badgeContent={pendingCount > 99 ? '99+' : pendingCount}
            sx={{ '& .MuiBadge-badge': sidebarBadgeSx }}
        />
    );
};

const ReturnBatchPendingBadgeIcon = ({ children }: { children: ReactNode }) => {
    const { pendingCount } = useReturnBatchPendingCount();
    return (
        <Badge
            badgeContent={pendingCount > 99 ? '99+' : pendingCount}
            invisible={pendingCount <= 0}
            sx={{ '& .MuiBadge-badge': sidebarIconBadgeSx }}
        >
            {children}
        </Badge>
    );
};

/** Isolated so only the Orders menu item polls PREPARING counts. */
const PreparingOrderBadgeLabel = () => {
    const { preparingCount } = usePreparingOrderCount();
    if (preparingCount <= 0) return null;
    return (
        <Badge
            badgeContent={preparingCount > 99 ? '99+' : preparingCount}
            sx={{ '& .MuiBadge-badge': sidebarBadgeSx }}
        />
    );
};

const PreparingOrderBadgeIcon = ({ children }: { children: ReactNode }) => {
    const { preparingCount } = usePreparingOrderCount();
    return (
        <Badge
            badgeContent={preparingCount > 99 ? '99+' : preparingCount}
            invisible={preparingCount <= 0}
            sx={{ '& .MuiBadge-badge': sidebarIconBadgeSx }}
        >
            {children}
        </Badge>
    );
};

/** Isolated so only the Chat / online-support menu item polls waiting/unread counts. */
const ChatAttentionBadgeLabel = () => {
    const { badgeCount } = useChatWaitingCount();
    if (badgeCount <= 0) return null;
    return (
        <Badge
            badgeContent={badgeCount > 99 ? '99+' : badgeCount}
            sx={{ '& .MuiBadge-badge': sidebarBadgeSx }}
        />
    );
};

const ChatAttentionBadgeIcon = ({ children }: { children: ReactNode }) => {
    const { badgeCount } = useChatWaitingCount();
    return (
        <Badge
            badgeContent={badgeCount > 99 ? '99+' : badgeCount}
            invisible={badgeCount <= 0}
            sx={{ '& .MuiBadge-badge': sidebarIconBadgeSx }}
        >
            {children}
        </Badge>
    );
};

export const NavItem = memo(({ item }: { item: any }) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { pathname, search } = useLocation();
    const { isOpen } = useSidebar();
    const { user } = useAuthStore();

    const handlePrefetch = useCallback((path: string) => {
        prefetchAdminRoute(path, (target) => router.prefetch(target));
    }, [router]);
    const showRefundBadge = item.id === 'refunds';
    const showPrizePayoutBadge = item.id === 'prize-payouts';
    const showPreparingBadge = item.id === 'orders';
    const showSupportBadge = item.id === 'support-tickets';
    const showChatBadge = item.id === 'chat';

    const normalizedRole = resolveRoleCode(user);
    const isStaff = normalizedRole.includes('STAFF');

    const filteredChildren = (item.children || []).filter((child: any) => {
        if (child.hidden) return false;
        if (isStaff && child.hideIfStaff) return false;
        return hasPermission(user, child.permission);
    });

    if (item.children?.length && filteredChildren.length === 0) {
        return null;
    }

    const hasChildren = filteredChildren.length > 0;

    const isChildActive = hasChildren
        ? filteredChildren.some((c: any) => isNavChildActive(pathname, search, c.path, filteredChildren))
        : false;
    const isActive = !hasChildren && (
        pathname === item.path
        || (
            item.path?.endsWith('/list')
            && isListSectionDetailRoute(item.path.replace(/\/list$/, '/'), pathname)
        )
    );

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
                onMouseEnter={(event) => {
                    if (!hasChildren && item.path) {
                        handlePrefetch(item.path);
                    }
                    handleMouseEnter(event);
                }}
                onMouseLeave={handleMouseLeave}
                sx={{
                    padding: isOpen ? "4px 8px 4px 12px" : "8px 4px 6px",
                    width: "100%",
                    minHeight: isOpen ? "44px" : "58px",
                    borderRadius: "8px",
                    color: isParentHighlighted ? "#FF3030" : "#637381",
                    bgcolor: isParentHighlighted ? "#FF303014" : "transparent",
                    flexDirection: isOpen ? "row" : "column",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isOpen ? "flex-start" : "center",
                    gap: isOpen ? "0" : "6px",

                    '&:hover': {
                        bgcolor: isParentHighlighted ? "#FF303026" : "#919eab14",
                    },

                    fontWeight: isParentHighlighted ? 600 : 500,
                }}
            >
                {Icon && (
                    <ListItemIcon sx={{
                        color: 'inherit',
                        mr: isOpen ? "12px" : "0",
                        minWidth: "24px",
                        position: 'relative',
                        '& svg': { width: 22, height: 22 }
                    }}>
                        {!isOpen && showRefundBadge ? (
                            <RefundPendingBadgeIcon>
                                <Icon />
                            </RefundPendingBadgeIcon>
                        ) : !isOpen && showPrizePayoutBadge ? (
                            <PrizePayoutPendingBadgeIcon>
                                <Icon />
                            </PrizePayoutPendingBadgeIcon>
                        ) : !isOpen && showSupportBadge ? (
                            <SupportTicketOpenBadgeIcon>
                                <Icon />
                            </SupportTicketOpenBadgeIcon>
                        ) : !isOpen && showChatBadge ? (
                            <ChatAttentionBadgeIcon>
                                <Icon />
                            </ChatAttentionBadgeIcon>
                        ) : !isOpen && showPreparingBadge ? (
                            <PreparingOrderBadgeIcon>
                                <Icon />
                            </PreparingOrderBadgeIcon>
                        ) : (
                            <Icon />
                        )}
                    </ListItemIcon>
                )}

                {isOpen && (
                    <span className="flex-1 text-[0.875rem] text-left flex items-center min-w-0 self-stretch">
                        <span className="truncate min-w-0">{t(item.tKey || item.label)}</span>
                        {showRefundBadge && (
                            <span className="ml-auto pl-2 shrink-0 inline-flex items-center">
                                <RefundPendingBadgeLabel />
                            </span>
                        )}
                        {showPrizePayoutBadge && (
                            <span className="ml-auto pl-2 shrink-0 inline-flex items-center">
                                <PrizePayoutPendingBadgeLabel />
                            </span>
                        )}
                        {showSupportBadge && (
                            <span className="ml-auto pl-2 shrink-0 inline-flex items-center">
                                <SupportTicketOpenBadgeLabel />
                            </span>
                        )}
                        {showChatBadge && (
                            <span className="ml-auto pl-2 shrink-0 inline-flex items-center">
                                <ChatAttentionBadgeLabel />
                            </span>
                        )}
                        {showPreparingBadge && (
                            <span className="ml-auto pl-2 shrink-0 inline-flex items-center">
                                <PreparingOrderBadgeLabel />
                            </span>
                        )}
                    </span>
                )}
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
                                backdropFilter: "blur(20px)",
                                width: "220px",
                                backgroundColor: "#ffffff",
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
                                            isSubActive={isNavChildActive(pathname, search, child.path, filteredChildren)}
                                            t={t}
                                            onPrefetch={handlePrefetch}
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
                                    isSubActive={isNavChildActive(pathname, search, child.path, filteredChildren)}
                                    t={t}
                                    onPrefetch={handlePrefetch}
                                />
                            ))}
                    </ul>
                </Collapse>
            )}
        </li>
    );
});
