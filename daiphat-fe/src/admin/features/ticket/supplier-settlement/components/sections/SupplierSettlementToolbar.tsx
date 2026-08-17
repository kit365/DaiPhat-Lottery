"use client";

import { Toolbar, Box, Button, Badge, SvgIcon } from '@mui/material';
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { IGridSettings, JiraFilter } from '../../../../../shared/data-grid';
import { Search } from '../../../../../components/ui/Search';
import { Columns } from '../../../../../components/ui/Columns';
import { SettingsList } from '../../../../../components/ui/SettingsList';
import { SupplierSettlementStatus } from '../../types/supplierSettlement.type';

interface SupplierSettlementToolbarProps {
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    filters: {
        search?: string;
        status?: SupplierSettlementStatus;
        expiredOnly?: boolean;
    };
    expiredCount?: number;
    onSearchChange: (search: string) => void;
    onStatusChange?: (status?: SupplierSettlementStatus) => void;
    onExpiredOnlyToggle?: (val?: boolean) => void;
}

export const SupplierSettlementToolbar = ({
    settings,
    onSettingsChange,
    filters,
    expiredCount = 0,
    onSearchChange,
    onStatusChange,
    onExpiredOnlyToggle,
}: SupplierSettlementToolbarProps) => {
    const filterFields = useMemo(() => {
        return [
            {
                id: 'status',
                label: 'Trạng thái đối soát',
                options: [
                    { value: 'OPEN', label: 'Đang mở' },
                    { value: 'RECEIPT_OVERDUE', label: 'Trễ hạn thanh toán' },
                    { value: 'COMPLETED', label: 'Đã thanh toán' },
                ],
            },
            {
                id: 'expiredOnly',
                label: 'Hạn trả vé',
                options: [
                    { value: 'true', label: `Quá hạn trả vé (${expiredCount} kỳ)` },
                ],
            },
        ];
    }, [expiredCount]);

    const selectedFilters = useMemo(() => {
        const sel: Record<string, string[]> = {};
        if (filters.status) sel.status = [filters.status];
        if (filters.expiredOnly) sel.expiredOnly = ['true'];
        return sel;
    }, [filters.status, filters.expiredOnly]);

    const handleFilterChange = (fieldId: string, values: string[]) => {
        if (fieldId === 'status') {
            onStatusChange?.(values.length > 0 ? (values[0] as SupplierSettlementStatus) : undefined);
        } else if (fieldId === 'expiredOnly') {
            onExpiredOnlyToggle?.(values.includes('true'));
        }
    };

    const handleClearFilters = () => {
        onStatusChange?.(undefined);
        onExpiredOnlyToggle?.(false);
    };

    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo tên hoặc mã nhà cung cấp..."
                    value={filters.search || ''}
                    onChange={onSearchChange}
                />
            </Box>
            <Box className="admin-list-toolbar__actions">
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearAll={handleClearFilters}
                    trigger={({ onClick, totalFilterCount }) => (
                        <Button
                            variant="text"
                            size="small"
                            disableElevation
                            className="admin-list-action-button"
                            onClick={onClick}
                            startIcon={
                                <Badge badgeContent={totalFilterCount} color="primary" variant="dot">
                                    <SvgIcon viewBox="0 0 24 24">
                                        <g fill="none" fillRule="evenodd">
                                            <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                            <path
                                                fill="currentColor"
                                                d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                            />
                                        </g>
                                    </SvgIcon>
                                </Badge>
                            }
                        >
                            Bộ lọc
                        </Button>
                    )}
                />
                <Columns />
                <SettingsList settings={settings} onSettingsChange={onSettingsChange} />
            </Box>
        </Toolbar>
    );
};
