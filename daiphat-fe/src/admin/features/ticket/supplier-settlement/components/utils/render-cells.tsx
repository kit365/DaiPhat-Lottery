"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import type { ReactNode } from 'react';
import { Link } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { ROUTES } from '../../../../../constants/routes';
import { AdminRowActionsMenu } from '../../../../../components/ui/AdminRowActionsMenu';
import { formatImportCost, formatVnd } from '../../../import-batch/utils/importCostCalculator';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
} from '../../utils/settlementLabels';

export const RenderSettlementCodeCell = (params: GridRenderCellParams) => {
    const router = useAdminRouter();
    const id = params.row.id;
    const code = params.row.supplierSettlementCode || (id != null ? `#${id}` : '—');
    const isExpired = params.row.isReturnExpired;

    return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Link
                href={ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id)}
                onClick={(e) => {
                    e.preventDefault();
                    router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id));
                }}
                underline="hover"
                sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: isExpired ? '#b91c1c' : '#0f172a',
                    bgcolor: isExpired ? '#fee2e2' : '#f8fafc',
                    border: `1px solid ${isExpired ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    px: 1,
                    py: 0.35,
                    lineHeight: 1.2,
                    display: 'inline-block',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        bgcolor: isExpired ? '#fecaca' : '#f1f5f9',
                        borderColor: isExpired ? '#f87171' : '#cbd5e1',
                        transform: 'translateY(-1px)',
                    },
                }}
                title={`Xem chi tiết đối soát ${code}`}
            >
                {code}
            </Link>
        </div>
    );
};

export const RenderSupplierNameCell = (params: GridRenderCellParams) => {
    const router = useAdminRouter();
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
                    router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id));
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
            {formatVnd(params.value)}
        </span>
    </MoneyCellWrapper>
);

export const RenderRemainingMoneyCell = (params: GridRenderCellParams) => {
    const isExpired = params.row.isReturnExpired;
    const value = params.value ?? 0;
    return (
        <MoneyCellWrapper>
            <span
                className="admin-cell-text"
                style={{
                    fontWeight: 700,
                    color: value > 0 && isExpired ? '#dc2626' : value > 0 ? '#166534' : '#64748b',
                    textAlign: 'center',
                }}
            >
                {formatImportCost(value)} VNĐ
            </span>
        </MoneyCellWrapper>
    );
};

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
    const router = useAdminRouter();
    const id = params.row.id;

    return (
        <AdminRowActionsMenu
            items={[
                {
                    id: 'detail',
                    label: 'Xem chi tiết',
                    icon: 'view',
                    onClick: () => router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id)),
                },
            ]}
        />
    );
};
