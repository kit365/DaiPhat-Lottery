"use client";

import { useMemo } from 'react';
import { RoleEnum } from "../../../../../types/role.type";
import { Toolbar, Box, Button, Badge, SvgIcon } from '@mui/material';
import { Search } from "../../../../components/ui/Search";
import { JiraFilter } from "../../../../shared/data-grid";

interface UserToolbarProps {
    filterName: string;
    onFilterName: (value: string) => void;
    filterRoles?: string[];
    onFilterRoles?: (values: string[]) => void;
    isClient?: boolean;
}

export const UserToolbar = ({
    filterName,
    onFilterName,
    filterRoles,
    onFilterRoles,
    isClient
}: UserToolbarProps) => {

    const filterFields = useMemo(() => {
        const fields: any[] = [];
        if (!isClient && onFilterRoles) {
            fields.push({
                id: 'roles',
                label: 'Vai trò',
                options: [
                    { value: RoleEnum.ADMIN, label: 'Admin' },
                    { value: RoleEnum.STAFF_OPERATOR, label: 'Nhân viên vận hành' }
                ]
            });
        }
        return fields;
    }, [isClient, onFilterRoles]);

    const handleFilterChange = (fieldId: string, values: string[]) => {
        if (fieldId === 'roles' && onFilterRoles) {
            onFilterRoles(values);
        }
    };

    const handleClearFilters = () => {
        if (onFilterRoles) onFilterRoles([]);
    };

    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder={isClient ? "Tìm kiếm khách hàng..." : "Tìm kiếm nhân viên..."}
                    value={filterName || ''}
                    onChange={onFilterName}
                />
            </Box>
            <Box className="admin-list-toolbar__actions">
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        roles: filterRoles || []
                    }}
                    onFilterChange={handleFilterChange}
                    onClearAll={handleClearFilters}
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
                                        sx={{ '& .MuiBadge-badge': { backgroundColor: "#FF5630" } }}
                                    >
                                        <SvgIcon sx={{ fontSize: '1.125rem !important' }} viewBox="0 0 24 24">
                                            <g fill="none" fillRule="evenodd">
                                                <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                                <path
                                                    fill="#1C252E"
                                                    d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                                />
                                            </g>
                                        </SvgIcon>
                                    </Badge>
                                }
                                className="admin-list-action-button"
                            >
                                Lọc
                            </Button>
                    )}
                />
            </Box>
        </Toolbar>
    );
};
