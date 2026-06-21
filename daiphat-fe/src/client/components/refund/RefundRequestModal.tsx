import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderResponse } from '../../../types/order.type';
import { OrderDetailStatus } from '../../../types/order.type';
import { RefundType } from '../../../types/refund.type';
import { useGetBankAccounts } from '../../hooks/useBankAccount';
import { useCreateRefund, useGetRefundTypes } from '../../hooks/useRefund';
import { BankAccountFormModal } from './BankAccountFormModal';
import { AppToast } from '../../utils/toast.util';

interface RefundRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderResponse;
    initialRefundType?: RefundType;
    initialOrderDetailId?: number;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
    isOpen,
    onClose,
    order,
    initialRefundType = RefundType.FULL_ORDER,
    initialOrderDetailId
}) => {
    const navigate = useNavigate();
    const { data: bankAccountsData } = useGetBankAccounts();
    const { data: typesData } = useGetRefundTypes();
    const createMutation = useCreateRefund();

    const [refundType, setRefundType] = useState<RefundType>(initialRefundType);
    const [orderDetailId, setOrderDetailId] = useState<number | undefined>(initialOrderDetailId);
    const [refundAmount, setRefundAmount] = useState<number>(0);
    const [refundReason, setRefundReason] = useState('');
    const [bankAccountId, setBankAccountId] = useState<number | ''>('');
    const [showBankForm, setShowBankForm] = useState(false);

    const bankAccounts = bankAccountsData?.data || [];
    const refundTypes = typesData?.data || [];

    const activeTickets = useMemo(
        () =>
            (order.orderDetails || []).filter(
                (d: any) => d.status === OrderDetailStatus.ACTIVE || d.status === 'ACTIVE'
            ),
        [order.orderDetails]
    );

    useEffect(() => {
        if (!isOpen) return;

        setRefundType(initialRefundType);
        setOrderDetailId(initialOrderDetailId);
        setRefundReason('');

        const defaultBank = bankAccounts.find((a) => a.isDefault) || bankAccounts[0];
        setBankAccountId(defaultBank?.id || '');
    }, [isOpen, initialRefundType, initialOrderDetailId, bankAccounts]);

    useEffect(() => {
        if (refundType === RefundType.FULL_ORDER) {
            setRefundAmount(order.totalAmount || 0);
            setOrderDetailId(undefined);
        } else if (orderDetailId) {
            const detail = (order.orderDetails || []).find((d: any) => d.id === orderDetailId);
            setRefundAmount(detail?.price || 0);
        }
    }, [refundType, orderDetailId, order]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!refundReason.trim()) {
            AppToast.error('Vui lòng nhập lý do hoàn tiền');
            return;
        }

        if (refundType === RefundType.ORDER_DETAIL && !orderDetailId) {
            AppToast.error('Vui lòng chọn vé cần hoàn');
            return;
        }

        if (!bankAccountId) {
            AppToast.error('Vui lòng chọn tài khoản ngân hàng nhận hoàn');
            return;
        }

        if (refundAmount <= 0) {
            AppToast.error('Số tiền hoàn phải lớn hơn 0');
            return;
        }

        createMutation.mutate(
            {
                refundType,
                orderId: order.id,
                orderDetailId: refundType === RefundType.ORDER_DETAIL ? orderDetailId : undefined,
                refundAmount,
                refundReason: refundReason.trim(),
                bankAccountId: Number(bankAccountId)
            },
            {
                onSuccess: (res) => {
                    if (res.success && res.data) {
                        onClose();
                        navigate(`/profile/refunds/${res.data.id}`);
                    }
                }
            }
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-[#E5E8EB] sticky top-0 bg-white z-10">
                        <h2 className="text-[18px] font-bold text-[#212B36]">Yêu cầu hoàn tiền</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">Loại hoàn tiền *</label>
                            <div className="flex flex-col gap-2">
                                {(refundTypes.length > 0
                                    ? refundTypes
                                    : [
                                          { value: RefundType.FULL_ORDER, label: 'Hoàn cả đơn' },
                                          { value: RefundType.ORDER_DETAIL, label: 'Hoàn từng vé' }
                                      ]
                                ).map((type) => (
                                    <label
                                        key={type.value}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                            refundType === type.value
                                                ? 'border-[#ee1314] bg-[#FFF4F4]'
                                                : 'border-[#E5E8EB] hover:border-[#919EAB]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="refundType"
                                            value={type.value}
                                            checked={refundType === type.value}
                                            onChange={() => setRefundType(type.value as RefundType)}
                                            className="accent-[#ee1314]"
                                        />
                                        <span className="text-[14px] font-medium text-[#212B36]">{type.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {refundType === RefundType.ORDER_DETAIL && (
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-bold text-[#454F5B]">Chọn vé *</label>
                                <select
                                    value={orderDetailId || ''}
                                    onChange={(e) => setOrderDetailId(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] cursor-pointer"
                                    required
                                >
                                    <option value="">-- Chọn vé --</option>
                                    {activeTickets.map((ticket: any) => (
                                        <option key={ticket.id} value={ticket.id}>
                                            Vé #{ticket.id} - {(ticket.price || 0).toLocaleString('vi-VN')}đ
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">Số tiền hoàn *</label>
                            <input
                                type="number"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(Number(e.target.value))}
                                min={1}
                                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314]"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">
                                Lý do hoàn tiền * <span className="font-normal text-[#919EAB]">(tối đa 500 ký tự)</span>
                            </label>
                            <textarea
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value.slice(0, 500))}
                                rows={4}
                                placeholder="Mô tả lý do bạn muốn hoàn tiền..."
                                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] resize-none"
                                required
                            />
                            <span className="text-[11px] text-[#919EAB] text-right">{refundReason.length}/500</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">Tài khoản nhận hoàn *</label>
                            {bankAccounts.length === 0 ? (
                                <div className="p-4 bg-[#FFF9F3] border border-[#FFB020]/30 rounded-xl text-center">
                                    <p className="text-[13px] text-[#637381] mb-3">Bạn chưa có tài khoản ngân hàng</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowBankForm(true)}
                                        className="text-[#ee1314] font-bold text-[14px] hover:underline cursor-pointer"
                                    >
                                        + Thêm tài khoản ngân hàng
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={bankAccountId}
                                        onChange={(e) => setBankAccountId(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] cursor-pointer"
                                        required
                                    >
                                        {bankAccounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.bankName} - {account.bankAccountNo}
                                                {account.isDefault ? ' (Mặc định)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowBankForm(true)}
                                        className="text-[13px] text-[#ee1314] font-bold hover:underline text-left cursor-pointer"
                                    >
                                        + Thêm tài khoản mới
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#637381] font-bold text-[14px] hover:bg-[#F4F6F8] transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || bankAccounts.length === 0}
                                className="flex-1 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {createMutation.isPending ? (
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                ) : (
                                    'Gửi yêu cầu'
                                )}
                            </button>
                        </div>
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
