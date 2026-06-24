import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderResponse } from '../../../types/order.type';
import { calculateOrderRefundAmount, maskBankAccountNo } from '../../../types/refund.type';
import { useGetBankAccounts } from '../../hooks/useBankAccount';
import { useCreateOrderRefund } from '../../hooks/useRefund';
import { BankAccountFormModal } from './BankAccountFormModal';
import { AppToast } from '../../utils/toast.util';

interface RefundRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderResponse;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
    isOpen,
    onClose,
    order
}) => {
    const navigate = useNavigate();
    const { data: bankAccountsData, isLoading: isLoadingBankAccounts } = useGetBankAccounts(isOpen);
    const createMutation = useCreateOrderRefund();

    const [refundReason, setRefundReason] = useState('');
    const [bankAccountId, setBankAccountId] = useState<number | ''>('');
    const [showBankForm, setShowBankForm] = useState(false);

    const bankAccounts = bankAccountsData?.data || [];
    const refundAmount = useMemo(() => calculateOrderRefundAmount(order), [order]);
    const isSubmitting = createMutation.isPending;

    useEffect(() => {
        if (!isOpen) return;

        setRefundReason('');
        const defaultBank = bankAccounts.find((a) => a.isDefault) || bankAccounts[0];
        setBankAccountId(defaultBank?.id || '');
    }, [isOpen, bankAccounts]);

    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (!refundReason.trim()) {
            AppToast.error('Vui lòng nhập lý do hủy đơn');
            return;
        }

        if (!bankAccountId) {
            AppToast.error('Vui lòng chọn tài khoản ngân hàng nhận hoàn');
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

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={handleClose}
                ></div>
                <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-[#E5E8EB] sticky top-0 bg-white z-10">
                        <h2 className="text-[18px] font-bold text-[#212B36]">Hủy đơn & Hoàn tiền</h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer disabled:opacity-50"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                        <div className="p-4 bg-[#FFF9F3] border border-[#FFB020]/30 rounded-xl text-[13px] text-[#637381] leading-relaxed">
                            Đơn hàng sẽ được hủy ngay và vé trả về kho. Yêu cầu hoàn tiền được ghi nhận tự động,
                            số tiền sẽ được chuyển về tài khoản bạn chọn.
                        </div>

                        <div className="flex flex-col gap-1 p-4 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl">
                            <span className="text-[13px] text-[#637381]">Số tiền hoàn (tự động tính)</span>
                            <span className="text-[22px] font-bold text-[#ee1314]">
                                {refundAmount.toLocaleString('vi-VN')}đ
                            </span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">
                                Lý do hủy đơn * <span className="font-normal text-[#919EAB]">(tối đa 500 ký tự)</span>
                            </label>
                            <textarea
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value.slice(0, 500))}
                                rows={4}
                                placeholder="Mô tả lý do bạn muốn hủy đơn..."
                                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] resize-none"
                                required
                                disabled={isSubmitting}
                            />
                            <span className="text-[11px] text-[#919EAB] text-right">{refundReason.length}/500</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">Tài khoản nhận hoàn *</label>
                            {isLoadingBankAccounts ? (
                                <div className="p-4 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl text-center text-[13px] text-[#637381]">
                                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải tài khoản...
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="p-4 bg-[#FFF9F3] border border-[#FFB020]/30 rounded-xl text-center">
                                    <p className="text-[13px] text-[#637381] mb-3">Bạn chưa có tài khoản ngân hàng</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowBankForm(true)}
                                        disabled={isSubmitting}
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
                                        disabled={isSubmitting}
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
                                        disabled={isSubmitting}
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
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#637381] font-bold text-[14px] hover:bg-[#F4F6F8] transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Đóng
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || isLoadingBankAccounts || bankAccounts.length === 0}
                                className="flex-1 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                ) : (
                                    'Xác nhận hủy & hoàn tiền'
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
