"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import type { ReactNode } from 'react';
import { Link, Tooltip } from '@mui/material';
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
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: isExpired ? '#b91c1c' : '#0f172a',
                    display: 'inline-block',
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

const formatCutOffTime = (raw?: unknown): string | null => {
    if (!raw) return null;
    if (typeof raw === 'string' && raw.trim()) {
        const match = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
        if (!match) return null;
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
            return null;
        }
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    if (Array.isArray(raw) && raw.length >= 2) {
        const hour = String(Number(raw[0]) || 0).padStart(2, '0');
        const minute = String(Number(raw[1]) || 0).padStart(2, '0');
        return `${hour}:${minute}`;
    }
    if (typeof raw === 'object') {
        const record = raw as { hour?: unknown; minute?: unknown };
        if (record.hour != null || record.minute != null) {
            const hour = String(Number(record.hour) || 0).padStart(2, '0');
            const minute = String(Number(record.minute) || 0).padStart(2, '0');
            return `${hour}:${minute}`;
        }
    }
    return null;
};

export const RenderPeriodCell = (params: GridRenderCellParams) => {
    const from = params.row.periodFrom ? dayjs(params.row.periodFrom).format('DD/MM/YYYY') : '';
    const to = params.row.periodTo ? dayjs(params.row.periodTo).format('DD/MM/YYYY') : '';
    const isSameDay = !to || from === to || (params.row.periodFrom && params.row.periodTo && dayjs(params.row.periodFrom).isSame(dayjs(params.row.periodTo), 'day'));
    const periodDisplay = !from && !to ? '—' : isSameDay ? (from || to) : `${from} → ${to}`;
    const cutOffTime = formatCutOffTime(params.row.paymentCutOffTime);

    return (
        <div className="flex flex-col gap-0.5 py-1 justify-center">
            <span className="admin-cell-text" style={{ fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                {periodDisplay}
            </span>
            {cutOffTime ? (
                <span className="admin-cell-subtitle" style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Hạn TT:</span>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{cutOffTime}</span>
                </span>
            ) : null}
        </div>
    );
};

export const RenderPaymentProgressCell = (params: GridRenderCellParams) => {
    const importValue = params.row.totalImportValue ?? 0;
    const returnValue = params.row.totalReturnValue ?? 0;
    const paidValue = params.row.totalPaidAmount ?? 0;
    const remainingValue = params.row.remainingAmount ?? 0;
    
    const netDebt = importValue - returnValue;
    const progress = netDebt > 0 ? Math.min(100, Math.max(0, (paidValue / netDebt) * 100)) : (paidValue > 0 ? 100 : 0);
    const isOverdue = params.row.status === 'RECEIPT_OVERDUE';
    const isSettled = params.row.status === 'COMPLETED' || params.row.status === 'CLOSED';

    const tooltipContent = (
        <div className="flex flex-col gap-1.5 p-1 text-xs">
            <div className="flex justify-between gap-4">
                <span className="text-slate-300">Giá trị nhập:</span>
                <span className="font-semibold text-white">{formatVnd(importValue)}</span>
            </div>
            {returnValue > 0 && (
                <div className="flex justify-between gap-4">
                    <span className="text-slate-300">Giá trị trả:</span>
                    <span className="font-semibold text-rose-300">- {formatVnd(returnValue)}</span>
                </div>
            )}
            <div className="my-0.5 h-px bg-slate-600/50" />
            <div className="flex justify-between gap-4">
                <span className="text-slate-300">Đã thanh toán:</span>
                <span className="font-semibold text-emerald-400">{formatVnd(paidValue)}</span>
            </div>
            {remainingValue > 0 && (
                <div className="flex justify-between gap-4">
                    <span className="text-slate-300">Còn phải trả:</span>
                    <span className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-amber-300'}`}>{formatVnd(remainingValue)}</span>
                </div>
            )}
        </div>
    );

    return (
        <Tooltip title={tooltipContent} arrow placement="top">
            <div className="flex flex-col gap-1.5 justify-center w-full h-full py-2 px-3">
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                            isSettled ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center text-[11.5px] leading-none">
                    {isSettled ? (
                        <span className="text-emerald-600 font-medium">Đã thanh toán đủ</span>
                    ) : remainingValue > 0 ? (
                        <span className={`${isOverdue ? 'text-red-600' : 'text-slate-600'} font-medium`}>
                            Còn nợ: {formatVnd(remainingValue)}
                        </span>
                    ) : (
                        <span className="text-slate-400 font-medium">Chưa phát sinh</span>
                    )}
                    <span className="text-slate-400 font-medium">{Math.round(progress)}%</span>
                </div>
            </div>
        </Tooltip>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
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
