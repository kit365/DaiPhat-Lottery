"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PurchasedTicket } from '../../../types/lottery-ticket.type';
import { formatPrizePayoutCurrency } from '../../../types/prize-payout.type';
import { useGetBankAccounts } from '../../hooks/useBankAccount';
import { useCreatePrizePayout } from '../../hooks/usePrizePayout';
import { BankAccountFormModal } from '../refund/BankAccountFormModal';
import dayjs from 'dayjs';

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
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2>(1);
    const [bankAccountId, setBankAccountId] = useState<number | ''>('');
    const [showBankForm, setShowBankForm] = useState(false);
    const { data: bankAccountsData, isLoading: isLoadingBanks } = useGetBankAccounts(isOpen);
    const createMutation = useCreatePrizePayout();

    const bankAccounts = bankAccountsData?.data || [];

    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setBankAccountId('');
    }, [isOpen, ticket.orderDetailId]);

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
                        navigate(`/profile/prize-payouts/${response.data.id}`);
                        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                    }
                },
            }
        );
    };

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
                                <span className="font-bold tracking-wider">{ticket.numbers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#637381]">Giải</span>
                                <span className="font-medium">{ticket.matchedPrizeDisplayName || ticket.matchedPrizeCode}</span>
                            </div>
                            <div className="flex justify-between border-t border-dashed border-[#E5E8EB] pt-3">
                                <span className="text-[#637381]">Tiền trúng (gross)</span>
                                <span className="font-bold text-[#ee1314] text-[16px]">
                                    {formatPrizePayoutCurrency(ticket.prizeAmount)}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full py-3 bg-[#ee1314] text-white font-bold rounded-xl cursor-pointer"
                        >
                            Tiếp tục
                        </button>
                    </div>
                ) : (
                    <div className="p-5 flex flex-col gap-4">
                        <p className="text-[14px] text-[#637381]">Chọn tài khoản ngân hàng nhận thưởng</p>
                        {isLoadingBanks ? (
                            <p className="text-center text-[14px] text-[#637381] py-4">
                                <i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...
                            </p>
                        ) : bankAccounts.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-[14px] text-[#637381] mb-3">Chưa có tài khoản ngân hàng</p>
                                <button
                                    type="button"
                                    onClick={() => setShowBankForm(true)}
                                    className="text-[#ee1314] font-bold text-[14px] cursor-pointer"
                                >
                                    + Thêm tài khoản
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {bankAccounts.map((account) => (
                                    <label
                                        key={account.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                                            bankAccountId === account.id
                                                ? 'border-[#ee1314] bg-[#FFF4F4]'
                                                : 'border-[#E5E8EB]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="bankAccount"
                                            checked={bankAccountId === account.id}
                                            onChange={() => setBankAccountId(account.id)}
                                        />
                                        <div className="flex-1 text-[14px]">
                                            <p className="font-bold">{account.bankName}</p>
                                            <p className="text-[#637381]">{account.bankAccountNo}</p>
                                            <p className="text-[#637381] text-[13px]">{account.bankAccountName}</p>
                                        </div>
                                    </label>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShowBankForm(true)}
                                    className="text-[#ee1314] font-bold text-[13px] text-left cursor-pointer mt-1"
                                >
                                    + Thêm tài khoản khác
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-[#F4F6F8] text-[#212B36] font-bold rounded-xl cursor-pointer"
                            >
                                Quay lại
                            </button>
                            <button
                                type="button"
                                disabled={bankAccountId === '' || createMutation.isPending}
                                onClick={handleSubmit}
                                className="flex-[2] py-3 bg-[#ee1314] text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer"
                            >
                                {createMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <BankAccountFormModal
                isOpen={showBankForm}
                onClose={() => setShowBankForm(false)}
                onSuccess={(account) => {
                    setBankAccountId(account.id);
                    setShowBankForm(false);
                }}
            />
        </div>
    );
};
