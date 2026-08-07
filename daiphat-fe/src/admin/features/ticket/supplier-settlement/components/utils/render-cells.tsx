"use client";

import type { ReactElement, ReactNode } from 'react';
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
    const name = params.row.supplierName || '—';
    const code = params.row.supplierCode;

    return (
        <div className="flex flex-col gap-0.5 py-1">
            <Link
                href={ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id)}
                className="admin-cell-title"
                onClick={(e) => {
                    e.preventDefault();
                    navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id));
                }}
                underline="hover"
            >
                {name}
            </Link>
            {code ? <span className="admin-cell-subtitle">{code}</span> : null}
        </div>
    );
};

export const RenderPeriodCell = (params: GridRenderCellParams) => {
    const from = params.row.periodFrom ? dayjs(params.row.periodFrom).format('DD/MM/YYYY') : '—';
    const to = params.row.periodTo ? dayjs(params.row.periodTo).format('DD/MM/YYYY') : '—';
    return (
        <span className="admin-cell-text" style={{ fontWeight: 500, color: '#334155', whiteSpace: 'nowrap', display: 'inline-block' }}>
            {from} → {to}
        </span>
    );
};

const MoneyCellWrapper = ({ children }: { children: ReactNode }) => (
    <div className="flex h-full w-full items-center justify-center">{children}</div>
);

export const RenderMoneyCell = (params: GridRenderCellParams) => (
    <MoneyCellWrapper>
        <span className="admin-cell-text" style={{ fontWeight: 600, color: '#0f172a', textAlign: 'center' }}>
            {formatImportCost(params.value)} VNĐ
        </span>
    </MoneyCellWrapper>
);

export const RenderRemainingMoneyCell = (params: GridRenderCellParams) => (
    <MoneyCellWrapper>
        <span className="admin-cell-text" style={{ fontWeight: 700, color: '#166534', textAlign: 'center' }}>
            {formatImportCost(params.value)} VNĐ
        </span>
    </MoneyCellWrapper>
);

export const RenderPaidAtCell = (params: GridRenderCellParams) => {
    const paidAt = params.row.paidAt;
    if (!paidAt) {
        return <span className="admin-cell-text" style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa thanh toán</span>;
    }
    return (
        <span className="admin-cell-text" style={{ fontWeight: 600, color: '#0284c7', whiteSpace: 'nowrap' }}>
            {dayjs(paidAt).format('HH:mm DD/MM/YYYY')}
        </span>
    );
};

export const RenderStatusCell = (params: GridRenderCellParams) => {
    const label = getSupplierSettlementStatusLabel(params.row.status, params.row.statusLabel);
    const modifier = getSupplierSettlementStatusModifier(params.row.status);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
            <span className={`admin-status-badge ${modifier}`}>{label}</span>
        </div>
    );
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
