"use client";

import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Collapse, ListSubheader, Stack } from '@mui/material';
import { ArrowIcon } from "../../../assets/icons";
import { NavItem } from "./NavItem";
import { useSidebar } from "../../../context/sidebar/useSidebar";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { hasPermission, resolveRoleCode } from "../../../utils/permission.util";
interface Props {
    title: string;
    data: any[];
}

export const NavGroup = memo(({ title, data }: Props) => {
    const { t } = useTranslation();
    const { isOpen } = useSidebar();
    const { user } = useAuthStore();

    const normalizedRole = resolveRoleCode(user);
    const isStaff = normalizedRole.includes('STAFF');

    const filteredData = data.filter(item => {
        if (isStaff && item.hideIfStaff) return false;

        const hasItemAccess = hasPermission(user, item.permission);

        const visibleChildren = (item.children || []).filter((child: any) => {
            if (child.hidden) return false;
            if (isStaff && child.hideIfStaff) return false;
            return hasPermission(user, child.permission);
        });

        return hasItemAccess || visibleChildren.length > 0;
    });

    const [openGroup, setOpenGroup] = useState(true);

    const handleToggleGroup = useCallback(() => {
        setOpenGroup((prev) => !prev);
    }, []);




    if (filteredData.length === 0) return null;

    return (
        <li style={{ listStyle: 'none' }}>
            {isOpen && (
                <ListSubheader
                    component="div"
                    onClick={handleToggleGroup}
                    sx={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        textTransform: 'uppercase',
                        color: '#919EAB',
                        fontWeight: "700",
                        fontSize: "0.6875rem",
                        padding: "16px 8px 8px 12px",
                        position: "relative",
                        lineHeight: "1.5",
                        transition: "all 300ms",
                        backgroundColor: 'transparent',
                        '&:hover': {
                            color: "#1C252E",
                            pl: "16px",
                            '& svg': { opacity: 1 }
                        }
                    }}
                >
                    <ArrowIcon
                        sx={{
                            fontSize: "0.625rem",
                            position: "absolute",
                            left: "-4px",
                            top: "15px",
                            opacity: "0",
                            transition: "all 300ms",
                            transform: openGroup ? "rotate(0deg)" : "rotate(-90deg)"
                        }}
                    />
                    {t(title)}
                </ListSubheader>
            )}

            <Collapse in={openGroup} timeout="auto" unmountOnExit>
                <Stack component="ul" spacing={0.5} sx={{ p: 0, m: 0 }}>
                    {filteredData.map((item) => (
                        <NavItem key={item.id} item={item} />
                    ))}
                </Stack>
            </Collapse>
        </li>
    );
});
