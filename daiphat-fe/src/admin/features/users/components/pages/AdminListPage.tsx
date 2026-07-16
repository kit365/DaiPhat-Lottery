import { RoleEnum } from "../../../../../types/role.type";
import React, { useState } from 'react';
import { Box, Card, Button, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { UserTable } from '../sections/UserTable';
import { UserToolbar } from '../sections/UserToolbar';
import { useUsers } from '../../hooks/useUsers';
import { UserStatus } from '../../../../../types/user.type';
import { getTabBadgeStyles } from '../../../../utils/badge';
import { useMemo } from 'react';
import { UserQueryParams } from '../../types/user.types';
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { prefixAdmin } from "../../../../constants/routes";
import { useNavigate } from "react-router-dom";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";

export const AdminListPage = () => {
    const navigate = useNavigate();
    const [queryParams, setQueryParams] = useState<UserQueryParams>({
        page: 1,
        limit: 10,
        roleIds: [RoleEnum.ADMIN, RoleEnum.MEMBER, RoleEnum.STAFF_OPERATOR],
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

    const handleFilterChange = (field: string, value: any) => {
        setQueryParams(prev => ({ ...prev, [field]: value, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setQueryParams(prev => ({ ...prev, page: newPage }));
    };

    const handleLimitChange = (newLimit: number) => {
        setQueryParams(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    return (
        <Box className="admin-list-page">
            {/* Header */}
            <Box className="admin-list-header">
                <Box>
                    <Title title="Danh sách Nhân viên" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: `/${prefixAdmin}` },
                            { label: "Danh sách Nhân viên" },
                        ]}
                    />
                </Box>
                <CanAccess permission={PERMISSIONS.ACCOUNT.CREATE}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate(`/${prefixAdmin}/account-admin/create`)}
                        className="btn-primary-admin"
                    >
                        Thêm nhân viên
                    </Button>
                </CanAccess>
            </Box>
            <Card className="admin-list-card admin-list-card--table">
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
                    filterRoles={queryParams.roleIds || []}
                    onFilterRoles={(values) => handleFilterChange('roleIds', values)}
                    isClient={false}
                />
                <UserTable 
                    data={usersData?.data?.recordList || []}
                    isLoading={isLoading}
                    pagination={usersData?.data?.pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                    onRefresh={refetch}
                    isClient={false}
                />
            </Card>
        </Box>
    );
};
