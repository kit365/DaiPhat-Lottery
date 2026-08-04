"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { OrderResponse } from '../../../types/order.type';
import {
    formatRefundCountdown,
    formatRefundCurrency,
    maskBankAccountNo,
    resolveRefundAmount
} from '../../../types/refund.type';
import { useGetBankAccounts } from '../../hooks/useBankAccount';
import { useCreateOrderRefund, useGetOrderRefundEligibility } from '../../hooks/useRefund';
import { useRefundCountdown } from '../../hooks/useRefundCountdown';
import { BankAccountFormModal } from './BankAccountFormModal';
import {
    REFUND_REASON_SUGGESTIONS,
    applyRefundReasonSuggestion,
    isRefundSubmitBlocked,
    validateRefundSubmitFields,
} from './refundRequestForm.logic';
import { AppToast } from '../../../utils/toast.util';

interface RefundRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderResponse;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
    PENDING_PAYMENT: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    PREPARING: 'Đang chuẩn bị vé',
    PENDING_PICKUP: 'Chờ nhận vé',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy'
};

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({ isOpen, onClose, order }) => {
    const navigate = useNavigate();
    const { data: bankAccountsData, isLoading: isLoadingBankAccounts } = useGetBankAccounts(isOpen);
    const {
        data: eligibilityData,
        isLoading: isLoadingEligibility,
        isError: isEligibilityError
    } = useGetOrderRefundEligibility(order.id, isOpen);
    const createMutation = useCreateOrderRefund();

    const [refundReason, setRefundReason] = useState('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [bankAccountId, setBankAccountId] = useState<number | ''>('');
    const [showBankForm, setShowBankForm] = useState(false);

    const bankAccounts = bankAccountsData?.data || [];
    const eligibility = eligibilityData?.data;
    const refundTickets = eligibility?.refundTickets ?? [];
    const refundAmount = useMemo(
        () => resolveRefundAmount(eligibility, order),
        [eligibility, order]
    );
    const isSubmitting = createMutation.isPending;

    const { secondsLeft, isExpired, isLowTime } = useRefundCountdown({
        refundDeadlineAt: eligibility?.refundDeadlineAt,
        paymentSuccessAt: eligibility?.paymentSuccessAt,
        graceMinutes: eligibility?.graceMinutes,
        remainingSeconds: eligibility?.remainingSeconds,
        enabled: isOpen && !isLoadingEligibility && !!eligibility
    });

    const isRefundBlocked = isRefundSubmitBlocked({
        isExpired,
        isLoadingEligibility,
        isEligibilityError,
        eligibility,
    });

    useEffect(() => {
        if (!isOpen) return;
        setRefundReason('');
        setSelectedSuggestion(null);
        const defaultBank = bankAccounts.find((a) => a.isDefault) || bankAccounts[0];
        setBankAccountId(defaultBank?.id || '');
    }, [isOpen, bankAccounts]);

    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || isRefundBlocked) return;

        const validation = validateRefundSubmitFields({ refundReason, bankAccountId });
        if (!validation.ok) {
            AppToast.error(validation.message);
            return;
        }

        createMutation.mutate(
            {
                orderId: order.id,
                data: {
                    refundReason: refundReason.trim(),
                    bankAccountId: Number(bankAccountId)
                }
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        onClose();
                        navigate('/profile/orders');
                    }
                }
            }
        );
    };

    const formatDrawDate = (value?: string) => {
        if (!value) return '—';
        try {
            return format(new Date(value), 'dd/MM/yyyy');
        } catch {
            return value;
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        if (isSubmitting || isRefundBlocked) return;
        const applied = applyRefundReasonSuggestion(suggestion);
        setSelectedSuggestion(applied.selectedSuggestion);
        setRefundReason(applied.refundReason.slice(0, 500));
    };

    const handleReasonChange = (value: string) => {
        const next = value.slice(0, 500);
        setRefundReason(next);
        if (!next.trim()) {
            setSelectedSuggestion(null);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={handleClose}
                />
                <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between gap-3 p-6 border-b border-[#E5E8EB] sticky top-0 bg-white z-10">
                        <h2 className="text-[18px] font-bold text-[#212B36] min-w-0 truncate">
                            Hủy đơn & Hoàn tiền
                        </h2>
                        <div className="flex items-center gap-2.5 shrink-0">
                            {isLoadingEligibility ? (
                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4F6F8] border border-[#E5E8EB] text-[13px] text-[#637381]">
                                    <i className="fa-solid fa-spinner fa-spin text-[12px]" />
                                    <span className="text-[12px] font-medium">Đang tải...</span>
                                </div>
                            ) : (
                                <div
                                    className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border tabular-nums ${
                                        isRefundBlocked
                                            ? 'bg-[#FFF5F5] border-[#FECACA]'
                                            : isLowTime
                                              ? 'bg-[#FFF9F3] border-[#FFD666]'
                                              : 'bg-[#EAF1FF] border-[#91BAF8]'
                                    }`}
                                    title={isRefundBlocked ? 'Hết hạn hoàn tiền' : 'Thời gian còn lại để hoàn tiền'}
                                >
                                    <span
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                            isRefundBlocked
                                                ? 'bg-[#FEE2E2] text-[#C62828]'
                                                : isLowTime
                                                  ? 'bg-[#FFE7BA] text-[#B76E00]'
                                                  : 'bg-[#D6E4FF] text-[#1557C0]'
                                        }`}
                                        aria-hidden
                                    >
                                        <i className="fa-regular fa-clock text-[13px]" />
                                    </span>
                                    <div className="min-w-0 text-left leading-tight">
                                        <p
                                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                                                isRefundBlocked
                                                    ? 'text-[#C62828]'
                                                    : isLowTime
                                                      ? 'text-[#B76E00]'
                                                      : 'text-[#2065D1]'
                                            }`}
                                        >
                                            {isRefundBlocked ? 'Hết hạn' : isLowTime ? 'Sắp hết hạn' : 'Còn lại'}
                                        </p>
                                        <p
                                            className={`mt-0.5 text-[14px] font-bold whitespace-nowrap ${
                                                isRefundBlocked
                                                    ? 'text-[#B71C1C]'
                                                    : isLowTime
                                                      ? 'text-[#8A5A00]'
                                                      : 'text-[#0B4EA2]'
                                            }`}
                                        >
                                            {formatRefundCountdown(isRefundBlocked ? 0 : secondsLeft)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer disabled:opacity-50"
                                aria-label="Đóng"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                        {/* 1. Order information */}
                        <section className="p-4 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl flex flex-col gap-3">
                            <h3 className="text-[14px] font-bold text-[#212B36]">Thông tin đơn hàng</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                                <div>
                                    <span className="text-[#637381]">Mã đơn</span>
                                    <p className="font-semibold text-[#212B36] mt-0.5">
                                        {eligibility?.orderCode || order.orderCode}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#637381]">Trạng thái</span>
                                    <p className="font-semibold text-[#212B36] mt-0.5">
                                        {ORDER_STATUS_LABELS[eligibility?.orderStatus || order.status] ||
                                            eligibility?.orderStatus ||
                                            order.status}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#637381]">Ngày đặt</span>
                                    <p className="font-semibold text-[#212B36] mt-0.5">
                                        {formatDrawDate(eligibility?.orderCreatedAt || order.createdAt)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[#637381]">Tổng đơn hàng</span>
                                    <p className="font-semibold text-[#212B36] mt-0.5">
                                        {formatRefundCurrency(
                                            eligibility?.orderTotalAmount ?? order.totalAmount ?? 0
                                        )}
                                    </p>
                                </div>
                            </div>
                            <p className="text-[12px] text-[#637381] leading-relaxed border-t border-[#E5E8EB] pt-3">
                                {order.status === 'PREPARING' ? (
                                    <>
                                        Yêu cầu hoàn tiền sẽ được gửi cho nhân viên duyệt. Sau khi duyệt, đơn hàng
                                        sẽ được hủy và tiền sẽ được chuyển về tài khoản bạn chọn.
                                    </>
                                ) : (
                                    <>
                                        Đơn hàng sẽ được hủy ngay và vé trả về kho. Yêu cầu hoàn tiền được ghi nhận
                                        tự động, số tiền sẽ được chuyển về tài khoản bạn chọn.
                                    </>
                                )}
                            </p>
                        </section>

                        {/* Policy info */}
                        <section
                            className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                                eligibility?.dailyLimitReached
                                    ? 'bg-[#FFF5F5] border-[#FECACA]'
                                    : 'bg-[#F0F5FF] border-[#2065D1]/20'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <i
                                    className={`fa-solid text-[13px] ${
                                        eligibility?.dailyLimitReached
                                            ? 'fa-circle-exclamation text-[#C62828]'
                                            : 'fa-circle-info text-[#2065D1]'
                                    }`}
                                    aria-hidden
                                />
                                <h3
                                    className={`text-[13px] font-bold ${
                                        eligibility?.dailyLimitReached
                                            ? 'text-[#C62828]'
                                            : 'text-[#2065D1]'
                                    }`}
                                >
                                    Quy định hoàn tiền
                                </h3>
                            </div>
                            <div className="flex flex-col gap-1.5 text-[13px] text-[#454F5B]">
                                <p>
                                    Số yêu cầu hoàn tiền hôm nay:{' '}
                                    <span className="font-bold tabular-nums text-[#212B36]">
                                        {eligibility?.refundRequestsSubmittedToday ?? 0}
                                        {' / '}
                                        {eligibility?.maxRefundRequestsPerDay ?? '—'}
                                    </span>
                                </p>
                            </div>
                            {eligibility?.dailyLimitReached && eligibility?.reason && (
                                    <p className="text-[12px] text-[#C62828] leading-relaxed pt-1 border-t border-[#FECACA]">
                                        {eligibility.reason}
                                    </p>
                                )}
                        </section>

                        {/* 2. Bank account */}
                        <section className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">Tài khoản nhận hoàn *</label>
                            {isLoadingBankAccounts ? (
                                <div className="p-4 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl text-center text-[13px] text-[#637381]">
                                    <i className="fa-solid fa-spinner fa-spin mr-2" /> Đang tải tài khoản...
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="p-4 bg-[#FFF9F3] border border-[#FFB020]/30 rounded-xl text-center">
                                    <p className="text-[13px] text-[#637381] mb-3">Bạn chưa có tài khoản ngân hàng</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowBankForm(true)}
                                        disabled={isSubmitting || isRefundBlocked}
                                        className="text-[#ee1314] font-bold text-[14px] hover:underline cursor-pointer disabled:opacity-50"
                                    >
                                        + Thêm tài khoản ngân hàng
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={bankAccountId}
                                        onChange={(e) => setBankAccountId(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] cursor-pointer disabled:bg-[#F4F6F8] disabled:text-[#919EAB]"
                                        required
                                        disabled={isSubmitting || isRefundBlocked}
                                    >
                                        {bankAccounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.bankName} - {maskBankAccountNo(account.bankAccountNo)}
                                                {account.isDefault ? ' (Mặc định)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowBankForm(true)}
                                        disabled={isSubmitting || isRefundBlocked}
                                        className="text-[13px] text-[#ee1314] font-bold hover:underline text-left cursor-pointer disabled:opacity-50"
                                    >
                                        + Thêm tài khoản mới
                                    </button>
                                </>
                            )}
                        </section>

                        {/* 3. Ticket list */}
                        <section className="flex flex-col gap-3">
                            <h3 className="text-[14px] font-bold text-[#212B36]">Danh sách vé được hoàn</h3>
                            {isLoadingEligibility ? (
                                <div className="p-4 bg-[#F4F6F8] border border-[#E5E8EB] rounded-xl text-center text-[13px] text-[#637381]">
                                    <i className="fa-solid fa-spinner fa-spin mr-2" />
                                    Đang tải danh sách vé...
                                </div>
                            ) : refundTickets.length === 0 ? (
                                <div className="p-4 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl text-[13px] text-[#637381] text-center">
                                    Không có chi tiết vé. Số tiền hoàn được tính theo tổng đơn hàng.
                                </div>
                            ) : (
                                <div className="border border-[#E5E8EB] rounded-xl overflow-hidden">
                                    <div className="hidden sm:grid sm:grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.9fr_1fr] gap-2 px-4 py-3 bg-[#F4F6F8] text-[11px] font-bold text-[#637381] uppercase tracking-wide">
                                        <span>Vé số</span>
                                        <span>Nhà đài</span>
                                        <span>Ngày xổ</span>
                                        <span className="text-center">SL</span>
                                        <span className="text-right">Đơn giá</span>
                                        <span className="text-right">Thành tiền</span>
                                    </div>
                                    <div className="divide-y divide-[#E5E8EB]">
                                        {refundTickets.map((ticket, index) => (
                                            <div
                                                key={ticket.orderDetailId ?? index}
                                                className="p-4 sm:px-4 sm:py-3 sm:grid sm:grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.9fr_1fr] sm:gap-2 sm:items-center bg-white"
                                            >
                                                <div className="flex justify-between sm:block mb-2 sm:mb-0">
                                                    <span className="sm:hidden text-[11px] text-[#637381] font-medium">
                                                        Vé số
                                                    </span>
                                                    <span className="text-[14px] font-bold text-[#212B36]">
                                                        {ticket.numbers || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between sm:block mb-1 sm:mb-0">
                                                    <span className="sm:hidden text-[11px] text-[#637381]">Nhà đài</span>
                                                    <span className="text-[13px] text-[#212B36]">
                                                        {ticket.stationName || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between sm:block mb-1 sm:mb-0">
                                                    <span className="sm:hidden text-[11px] text-[#637381]">Ngày xổ</span>
                                                    <span className="text-[13px] text-[#212B36]">
                                                        {formatDrawDate(ticket.drawDate)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between sm:block mb-1 sm:mb-0 sm:text-center">
                                                    <span className="sm:hidden text-[11px] text-[#637381]">Số lượng</span>
                                                    <span className="text-[13px] font-medium text-[#212B36]">
                                                        {ticket.quantity}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between sm:block mb-1 sm:mb-0 sm:text-right">
                                                    <span className="sm:hidden text-[11px] text-[#637381]">Đơn giá</span>
                                                    <span className="text-[13px] text-[#212B36]">
                                                        {formatRefundCurrency(ticket.unitPrice)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between sm:block sm:text-right">
                                                    <span className="sm:hidden text-[11px] text-[#637381]">Thành tiền</span>
                                                    <span className="text-[13px] font-bold text-[#212B36]">
                                                        {formatRefundCurrency(ticket.subtotalAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 4. Total eligible */}
                        <section className="flex flex-col gap-1 p-4 bg-[#F0F5FF] border border-[#2065D1]/20 rounded-xl">
                            <span className="text-[13px] font-medium text-[#637381]">Tổng tiền đủ điều kiện hoàn</span>
                            <span className="text-[20px] font-bold text-[#2065D1]">
                                {formatRefundCurrency(refundAmount)}
                            </span>
                            {refundTickets.length > 1 && (
                                <p className="text-[12px] text-[#919EAB]">
                                    = Tổng thành tiền của {refundTickets.length} vé
                                </p>
                            )}
                        </section>

                        {/* 5. Auto-calculated refund amount */}
                        <section className="flex flex-col gap-1 p-4 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl">
                            <span className="text-[13px] text-[#637381]">Số tiền hoàn (tự động tính)</span>
                            <span className="text-[22px] font-bold text-[#ee1314]">
                                {refundAmount.toLocaleString('vi-VN')}đ
                            </span>
                        </section>

                        {/* 6. Reason */}
                        <section className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">
                                Lý do hủy đơn *{' '}
                                <span className="font-normal text-[#919EAB]">(tối đa 500 ký tự)</span>
                            </label>
                            <textarea
                                value={refundReason}
                                onChange={(e) => handleReasonChange(e.target.value)}
                                rows={4}
                                placeholder="Mô tả lý do bạn muốn hủy đơn..."
                                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] resize-none disabled:bg-[#F4F6F8] disabled:text-[#919EAB]"
                                required
                                disabled={isSubmitting || isRefundBlocked}
                            />
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[12px] text-[#919EAB]">Gợi ý nhanh — chọn một lý do</p>
                                <span className="text-[11px] text-[#919EAB] tabular-nums shrink-0">
                                    {refundReason.length}/500
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gợi ý lý do hoàn tiền">
                                {REFUND_REASON_SUGGESTIONS.map((suggestion) => {
                                    const isSelected = selectedSuggestion === suggestion;
                                    return (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            disabled={isSubmitting || isRefundBlocked}
                                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                                isSelected
                                                    ? 'bg-[#FFF4F4] border-[#ee1314]/40 text-[#ee1314]'
                                                    : 'bg-[#F9FAFB] border-[#E5E8EB] text-[#637381] hover:border-[#C4CDD5] hover:bg-white hover:text-[#212B36]'
                                            }`}
                                        >
                                            {suggestion}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 7. Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#637381] font-bold text-[14px] hover:bg-[#F4F6F8] transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Đóng
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    isLoadingBankAccounts ||
                                    bankAccounts.length === 0 ||
                                    isRefundBlocked
                                }
                                className="flex-1 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <i className="fa-solid fa-spinner fa-spin" />
                                ) : isRefundBlocked ? (
                                    eligibility?.reason?.trim()
                                        ? 'Không thể gửi yêu cầu'
                                        : 'Hết thời gian hoàn tiền'
                                ) : (
                                    'Xác nhận hủy & hoàn tiền'
                                )}
                            </button>
                        </div>
                        {isRefundBlocked && eligibility?.reason && (
                            <p className="text-[12px] text-[#C62828] leading-relaxed text-center sm:text-left">
                                {eligibility.reason}
                            </p>
                        )}
                    </form>
                </div>
            </div>

            <BankAccountFormModal
                isOpen={showBankForm}
                onClose={() => setShowBankForm(false)}
                onSuccess={(account) => setBankAccountId(account.id)}
            />
        </>
    );
};
