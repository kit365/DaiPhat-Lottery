"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from 'react';
import { PurchasedTicket } from '../../../types/lottery-ticket.type';
import { formatPrizePayoutCurrency, PrizePayoutPreviewResponse } from '../../../types/prize-payout.type';
import { useGetBankAccounts } from '../../hooks/useBankAccount';
import { useCreatePrizePayout } from '../../hooks/usePrizePayout';
import { BankAccountFormModal } from '../refund/BankAccountFormModal';
import { prizePayoutService } from '../../services/prizePayoutService';
import dayjs from 'dayjs';
import { LuckyNumber } from '../ui/LuckyNumber';

interface PrizePayoutRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: PurchasedTicket;
}

export const PrizePayoutRequestModal: React.FC<PrizePayoutRequestModalProps> = ({
    isOpen,
    onClose,
    ticket,
}) => {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [bankAccountId, setBankAccountId] = useState<number | ''>('');
    const [showBankForm, setShowBankForm] = useState(false);
    const [preview, setPreview] = useState<PrizePayoutPreviewResponse | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const { data: bankAccountsData, isLoading: isLoadingBanks } = useGetBankAccounts(isOpen);
    const createMutation = useCreatePrizePayout();

    const bankAccounts = bankAccountsData?.data || [];

    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setBankAccountId('');
        setPreview(null);
        setPreviewLoading(true);
        prizePayoutService
            .preview({ orderDetailId: ticket.orderDetailId, serialId: ticket.serialId })
            .then((res) => {
                if (res.success && res.data) {
                    setPreview(res.data);
                }
            })
            .finally(() => setPreviewLoading(false));
    }, [isOpen, ticket.orderDetailId, ticket.serialId]);

    useEffect(() => {
        if (bankAccountId === '' && bankAccounts.length === 1) {
            setBankAccountId(bankAccounts[0].id);
        }
    }, [bankAccounts, bankAccountId]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (bankAccountId === '') return;
        createMutation.mutate(
            {
                orderDetailId: ticket.orderDetailId,
                serialId: ticket.serialId,
                bankAccountId: Number(bankAccountId),
            },
            {
                onSuccess: (response) => {
                    if (response.success && response.data?.id) {
                        onClose();
                        router.push(`/profile/prize-payouts/${response.data.id}`);
                        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                    }
                },
            }
        );
    };

    const gross = preview?.grossAmount ?? ticket.prizeAmount;
    const tax = preview?.taxAmount;
    const commission = preview?.commissionAmount;
    const net = preview?.netAmount;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-[#E5E8EB]">
                    <h3 className="text-[18px] font-bold text-[#212B36]">Yêu cầu trả thưởng</h3>
                    <button type="button" onClick={onClose} className="text-[#919EAB] hover:text-[#212B36] cursor-pointer">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="px-5 pt-4 pb-2 flex gap-2">
                    {[1, 2].map((s) => (
                        <div
                            key={s}
                            className={`flex-1 h-1 rounded-full ${step >= s ? 'bg-[#ee1314]' : 'bg-[#E5E8EB]'}`}
                        />
                    ))}
                </div>

                {step === 1 ? (
                    <div className="p-5 flex flex-col gap-4">
                        <p className="text-[14px] text-[#637381]">Xác nhận thông tin vé trúng thưởng</p>
                        <div className="rounded-xl border border-[#E5E8EB] p-4 flex flex-col gap-3 text-[14px]">
                            <div className="flex justify-between">
                                <span className="text-[#637381]">Đài</span>
                                <span className="font-medium">{ticket.stationName || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#637381]">Ngày quay</span>
                                <span className="font-medium">
                                    {ticket.drawDate ? dayjs(ticket.drawDate).format('DD/MM/YYYY') : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#637381]">Dãy số</span>
                                <LuckyNumber value={ticket.numbers} ticket className="font-bold tracking-wider" />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#637381]">Giải</span>
                                <span className="font-medium">{ticket.matchedPrizeDisplayName || ticket.matchedPrizeCode}</span>
                            </div>
                            {previewLoading ? (
                                <div className="text-[#637381] text-[13px]">Đang tính số tiền thực nhận…</div>
                            ) : (
                                <>
                                    <div className="flex justify-between border-t border-dashed border-[#E5E8EB] pt-3">
                                        <span className="text-[#637381]">Giá trị giải</span>
                                        <span className="font-medium">{formatPrizePayoutCurrency(gross)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#637381]">Thuế TNCN</span>
                                        <span className="font-medium">{formatPrizePayoutCurrency(tax)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#637381]">Hoa hồng đại lý</span>
                                        <span className="font-medium">{formatPrizePayoutCurrency(commission)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-dashed border-[#E5E8EB] pt-3">
                                        <span className="text-[#637381]">Thực nhận</span>
                                        <span className="font-bold text-[#ee1314] text-[16px]">
                                            {formatPrizePayoutCurrency(net ?? gross)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        <p className="text-[12px] text-[#919EAB] m-0">
                            Yêu cầu vẫn cần nhân viên duyệt trước khi chuyển tiền.
                        </p>
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            disabled={previewLoading || (preview != null && !preview.canClaimOnline)}
                            className="w-full py-3 bg-[#ee1314] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                        >
                            Tiếp tục
                        </button>
                    </div>
                ) : (
                    <div className="p-5 flex flex-col gap-4">
                        <p className="text-[14px] text-[#637381]">Chọn tài khoản nhận thưởng</p>
                        {isLoadingBanks ? (
                            <div className="text-[#637381] text-[14px]">Đang tải tài khoản…</div>
                        ) : bankAccounts.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#E5E8EB] p-4 text-center">
                                <p className="text-[14px] text-[#637381] mb-3">Bạn chưa có tài khoản ngân hàng.</p>
                                <button
                                    type="button"
                                    onClick={() => setShowBankForm(true)}
                                    className="px-4 py-2 bg-[#212B36] text-white rounded-lg text-[13px] font-bold cursor-pointer"
                                >
                                    Thêm tài khoản
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {bankAccounts.map((account) => (
                                    <label
                                        key={account.id}
                                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                                            bankAccountId === account.id
                                                ? 'border-[#ee1314] bg-[#FFF5F5]'
                                                : 'border-[#E5E8EB]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="bankAccount"
                                            checked={bankAccountId === account.id}
                                            onChange={() => setBankAccountId(account.id)}
                                            className="mt-1"
                                        />
                                        <div className="flex flex-col gap-0.5 text-[13px]">
                                            <span className="font-bold">{account.bankName}</span>
                                            <span className="font-mono">{account.bankAccountNo}</span>
                                            <span className="text-[#637381]">{account.bankAccountName}</span>
                                        </div>
                                    </label>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShowBankForm(true)}
                                    className="text-[13px] text-[#ee1314] font-bold self-start cursor-pointer bg-transparent border-none"
                                >
                                    + Thêm tài khoản khác
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 border border-[#E5E8EB] rounded-xl font-bold cursor-pointer"
                            >
                                Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={bankAccountId === '' || createMutation.isPending}
                                className="flex-1 py-3 bg-[#ee1314] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                            >
                                {createMutation.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <BankAccountFormModal
                isOpen={showBankForm}
                onClose={() => setShowBankForm(false)}
            />
        </div>
    );
};
