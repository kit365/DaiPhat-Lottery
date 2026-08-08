"use client";

import { RoleEnum } from "../../../../../types/role.type";
import React, { useState } from 'react';
import { Card, Button, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { UserTable } from '../sections/UserTable';
import { UserToolbar } from '../sections/UserToolbar';
import { useUsers } from '../../hooks/useUsers';
import { UserStatus } from '../../../../../types/user.type';
import { getTabBadgeStyles } from '../../../../utils/badge';
import { useMemo } from 'react';
import { UserQueryParams } from '../../types/user.types';
import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { useNavigate } from "@/components/router-compat";
import { CanAccess } from "../../../../components/auth/CanAccess";

interface UserListPageBaseProps {
    /** Title hiển thị trên trang */
    title: string;
    /** roleIds mặc định để filter danh sách */
    defaultRoleIds: RoleEnum[];
    /** Permission để hiện nút "Thêm" */
    createPermission: string;
    /** Route path để navigate khi click "Thêm" */
    createPath: string;
    /** Label nút "Thêm" */
    createLabel: string;
    /** Có phải danh sách client không (ảnh hưởng đến UserToolbar/UserTable) */
    isClient: boolean;
}

/** Shared base component dùng chung cho AdminListPage & ClientListPage */
export const UserListPageBase = ({
    title,
    defaultRoleIds,
    createPermission,
    createPath,
    createLabel,
    isClient,
}: UserListPageBaseProps) => {
    const navigate = useNavigate();
    const [queryParams, setQueryParams] = useState<UserQueryParams>({
        page: 1,
        limit: 10,
        roleIds: defaultRoleIds,
    });

    const { data: usersData, isLoading, refetch } = useUsers(queryParams);

    const counts = useMemo(() => {
        const statusCounts = usersData?.data?.statusCounts || {};
        return {
            all: statusCounts.all || usersData?.data?.pagination?.totalRecords || 0,
            active: statusCounts[UserStatus.ACTIVE] || 0,
            pending: statusCounts[UserStatus.PENDING] || 0,
            locked: (statusCounts[UserStatus.LOCKED] || 0) + (statusCounts[UserStatus.BANNED] || 0),
        };
    }, [usersData]);

    const [tabStatus, setTabStatus] = useState<string>("ALL");

    const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
        setTabStatus(newValue);
        setQueryParams(prev => ({
            ...prev,
            status: newValue === "ALL" ? undefined : newValue,
            page: 1
        }));
    };

    const handleFilterChange = (field: string, value: unknown) => {
        setQueryParams(prev => ({ ...prev, [field]: value, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setQueryParams(prev => ({ ...prev, page: newPage }));
    };

    const handleLimitChange = (newLimit: number) => {
        setQueryParams(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    return (
        <>
            <PageHeader
                title={title}
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: title },
                        ]}
                action={
                    <div>
                    <CanAccess permission={createPermission}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate(`/${prefixAdmin}/${createPath}`)}
                            className="btn-primary-admin"
                        >
                            {createLabel}
                        </Button>
                    </CanAccess>
                </div>
                }
            />

            <Card elevation={0} className="admin-datagrid-card" sx={{ height: 'auto' }}>
                <Tabs
                    value={tabStatus}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons={false}
                    className="admin-tabs"
                >
                    <Tab
                        disableRipple
                        value="ALL"
                        label="Tất cả"
                        icon={
                            <span className="admin-tab-badge" style={getTabBadgeStyles('all', tabStatus === "ALL")}>
                                {counts.all}
                            </span>
                        }
                        iconPosition="end"
                        className="admin-tab"
                    />
                    <Tab
                        disableRipple
                        value={UserStatus.ACTIVE}
                        label="Hoạt động"
                        icon={
                            <span className="admin-tab-badge" style={getTabBadgeStyles('info', tabStatus === UserStatus.ACTIVE)}>
                                {counts.active}
                            </span>
                        }
                        iconPosition="end"
                        className="admin-tab"
                    />
                    <Tab
                        disableRipple
                        value={UserStatus.PENDING}
                        label="Chờ xử lý"
                        icon={
                            <span className="admin-tab-badge" style={getTabBadgeStyles('warning', tabStatus === UserStatus.PENDING)}>
                                {counts.pending}
                            </span>
                        }
                        iconPosition="end"
                        className="admin-tab"
                    />
                    <Tab
                        disableRipple
                        value={UserStatus.LOCKED}
                        label="Bị khóa"
                        icon={
                            <span className="admin-tab-badge" style={getTabBadgeStyles('error', tabStatus === UserStatus.LOCKED)}>
                                {counts.locked}
                            </span>
                        }
                        iconPosition="end"
                        className="admin-tab"
                    />
                </Tabs>
                <UserToolbar
                    filterName={queryParams.q || ''}
                    onFilterName={(value) => handleFilterChange('q', value)}
                    filterRoles={isClient ? undefined : (queryParams.roleIds || [])}
                    onFilterRoles={isClient ? undefined : ((values) => handleFilterChange('roleIds', values))}
                    isClient={isClient}
                />
                <div style={{ height: 640, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <UserTable
                        data={usersData?.data?.recordList || []}
                        isLoading={isLoading}
                        pagination={usersData?.data?.pagination}
                        onPageChange={handlePageChange}
                        onLimitChange={handleLimitChange}
                        onRefresh={refetch}
                        isClient={isClient}
                    />
                </div>
            </Card>
        </>
    );
};
