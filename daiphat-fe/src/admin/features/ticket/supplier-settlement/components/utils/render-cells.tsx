"use client";

import type { ReactElement } from 'react';
import { Link } from '@mui/material';
import { GridActionsCell, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useNavigate } from '@/components/router-compat';
import { EyeIcon } from '../../../../../assets/icons/index';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
} from '../../utils/settlementLabels';

export const RenderSupplierNameCell = (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const id = params.row.id;

    return (
        <Link
            href={ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id)}
            className="admin-cell-title"
            onClick={(e) => {
                e.preventDefault();
                navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id));
            }}
            underline="hover"
        >
            {params.row.supplierName || '—'}
        </Link>
    );
};

export const RenderPeriodCell = (params: GridRenderCellParams) => {
    const from = params.row.periodFrom ? dayjs(params.row.periodFrom).format('DD/MM/YYYY') : '—';
    const to = params.row.periodTo ? dayjs(params.row.periodTo).format('DD/MM/YYYY') : '—';
    return (
        <span className="admin-cell-text">
            {from} → {to}
        </span>
    );
};

export const RenderMoneyCell = (params: GridRenderCellParams) => (
    <span className="admin-cell-text">{formatImportCost(params.value)} VNĐ</span>
);

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const label = getSupplierSettlementStatusLabel(params.row.status, params.row.statusLabel);
    const modifier = getSupplierSettlementStatusModifier(params.row.status);
    return <span className={`admin-status-badge ${modifier}`}>{label}</span>;
};

export const RenderActionsCell = (params: GridRenderCellParams) => {
    const navigate = useNavigate();
    const id = params.row.id;

    const items: ReactElement[] = [
        <GridActionsCellItem
            key="detail"
            className="admin-menu-item"
            icon={<EyeIcon />}
            label="Xem chi tiết"
            showInMenu
            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id))}
        />,
    ];

    return <GridActionsCell {...params}>{items}</GridActionsCell>;
};
