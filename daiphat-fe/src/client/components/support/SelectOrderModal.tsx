"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { OrderStatusBadge } from '@/shared/components/StatusBadge';
import type { OrderResponse } from '../../../types/order.type';

const ORDER_CANCEL_TYPE_LABELS: Record<string, string> = {
    CUSTOMER_REQUEST: 'Bạn đã huỷ',
    ADMIN_FORCE_CANCEL: 'Nhân viên đã huỷ',
    SYSTEM_PAYMENT_TIMEOUT: 'Quá hạn thanh toán',
    OUT_OF_STOCK_INCIDENT: 'Sự cố kho vé',
};

interface SelectOrderDropdownProps {
    orders: OrderResponse[];
    isLoading?: boolean;
    selectedOrderId?: string;
    onSelect: (orderId: string) => void;
}

function resolveEligibility(order: OrderResponse) {
    if (order.complaintEligibility) {
        return {
            eligible: order.complaintEligibility.eligible,
            reason: order.complaintEligibility.message || 'Không đủ điều kiện',
        };
    }
    if (order.status === 'PENDING_PAYMENT') {
        return { eligible: false, reason: 'Chưa thanh toán' };
    }
    if (order.status === 'CANCELLED') {
        if (order.cancelType === 'CUSTOMER_REQUEST') {
            return { eligible: false, reason: 'Bạn đã huỷ đơn này' };
        }
        if (order.cancelType === 'ADMIN_FORCE_CANCEL') {
            return { eligible: false, reason: 'Nhân viên đã huỷ đơn này' };
        }
        if (order.cancelType !== 'SYSTEM_PAYMENT_TIMEOUT' && order.cancelType !== 'OUT_OF_STOCK_INCIDENT') {
            return { eligible: false, reason: 'Đơn đã huỷ' };
        }
    }
    return { eligible: true, reason: '' };
}

function shortOrderCode(order: OrderResponse) {
    return (order.orderCode || order.id).slice(0, 8).toUpperCase();
}

export const SelectOrderModal: React.FC<SelectOrderDropdownProps> = ({
    orders,
    isLoading = false,
    selectedOrderId,
    onSelect,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const selectedOrder = orders.find((order) => order.id === selectedOrderId);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter((order) => {
            const code = (order.orderCode || order.id).toLowerCase();
            const id = order.id.toLowerCase();
            return code.includes(q) || id.includes(q) || id.slice(0, 8).includes(q);
        });
    }, [orders, query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`w-full px-4 py-3 bg-white border rounded-xl text-[14px] flex items-center justify-between cursor-pointer transition-colors text-left ${
                    open ? 'border-[#ee1314]' : 'border-[#E5E8EB] hover:border-[#ee1314]'
                }`}
            >
                {selectedOrder ? (
                    <span className="min-w-0 flex items-center gap-2">
                        <span className="font-bold text-[#212B36] tabular-nums">
                            #{shortOrderCode(selectedOrder)}
                        </span>
                        <span className="text-[12px] text-[#637381] tabular-nums truncate">
                            {Number(selectedOrder.finalAmount ?? selectedOrder.totalAmount ?? 0).toLocaleString('vi-VN')}đ
                        </span>
                    </span>
                ) : (
                    <span className="text-[#919EAB]">Chọn đơn hàng...</span>
                )}
                <i
                    className={`fa-solid fa-chevron-down text-[#919EAB] text-[12px] transition-transform ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E8EB] rounded-xl shadow-lg z-30 overflow-hidden">
                    <div className="p-2 border-b border-[#E5E8EB]">
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#919EAB]" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Tìm mã đơn…"
                                className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#F4F6F8] text-[13px] text-[#212B36] outline-none placeholder:text-[#919EAB]"
                            />
                        </div>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto">
                        {isLoading ? (
                            <p className="py-8 text-center text-[13px] text-[#637381]">
                                <i className="fa-solid fa-spinner fa-spin mr-2" />
                                Đang tải…
                            </p>
                        ) : filtered.length === 0 ? (
                            <p className="py-8 text-center text-[13px] text-[#637381]">
                                {orders.length === 0 ? 'Bạn chưa có đơn hàng nào.' : 'Không có đơn phù hợp.'}
                            </p>
                        ) : (
                            filtered.map((order) => {
                                const eligibility = resolveEligibility(order);
                                const isSelected = order.id === selectedOrderId;
                                return (
                                    <button
                                        key={order.id}
                                        type="button"
                                        disabled={!eligibility.eligible}
                                        onClick={() => {
                                            if (!eligibility.eligible) return;
                                            onSelect(order.id);
                                            setOpen(false);
                                            setQuery('');
                                        }}
                                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-[#F4F6F8] last:border-b-0 ${
                                            !eligibility.eligible
                                                ? 'opacity-50 cursor-not-allowed'
                                                : isSelected
                                                  ? 'bg-[#FFF4F4] cursor-pointer'
                                                  : 'hover:bg-[#F4F6F8] cursor-pointer'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-[13px] text-[#212B36] tabular-nums">
                                                    #{shortOrderCode(order)}
                                                </span>
                                                <OrderStatusBadge status={order.status} />
                                            </div>
                                            <p className="mt-0.5 text-[12px] text-[#637381] tabular-nums">
                                                {order.createdAt
                                                    ? format(new Date(order.createdAt), 'dd/MM/yyyy')
                                                    : '—'}
                                                <span className="mx-1 text-[#C4CDD5]">·</span>
                                                {Number(order.finalAmount ?? order.totalAmount ?? 0).toLocaleString(
                                                    'vi-VN'
                                                )}
                                                đ
                                            </p>
                                            {!eligibility.eligible && (
                                                <p className="mt-0.5 text-[11px] text-[#637381]">{eligibility.reason}</p>
                                            )}
                                        </div>
                                        {isSelected && eligibility.eligible && (
                                            <i className="fa-solid fa-check text-[#ee1314] text-[12px] mt-1" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
