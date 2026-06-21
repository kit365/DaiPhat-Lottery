import React, { useEffect, useMemo, useState } from 'react';
import { UserBankAccountResponse, VietQrBankResponse } from '../../../types/refund.type';
import { useCreateBankAccount, useGetBanks, useUpdateBankAccount } from '../../hooks/useBankAccount';
import { AppToast } from '../../utils/toast.util';

const BANK_ACCOUNT_TERMS_TEXT =
    'Tôi cam kết thông tin tài khoản ngân hàng đã nhập là chính xác. Tôi hiểu rằng đại lý được miễn trừ trách nhiệm đối với các trường hợp hoàn tiền chậm trễ hoặc thất bại do thông tin tài khoản tôi cung cấp không chính xác.';

interface BankAccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingAccount?: UserBankAccountResponse | null;
    onSuccess?: (account: UserBankAccountResponse) => void;
}

export const BankAccountFormModal: React.FC<BankAccountFormModalProps> = ({
    isOpen,
    onClose,
    editingAccount,
    onSuccess
}) => {
    const { data: banksData, isLoading: isLoadingBanks } = useGetBanks();
    const createMutation = useCreateBankAccount();
    const updateMutation = useUpdateBankAccount();

    const [bankSearch, setBankSearch] = useState('');
    const [selectedBank, setSelectedBank] = useState<VietQrBankResponse | null>(null);
    const [bankAccountNo, setBankAccountNo] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [agreedToRefundTerms, setAgreedToRefundTerms] = useState(false);
    const [showBankDropdown, setShowBankDropdown] = useState(false);

    const banks = banksData?.data || [];
    const isEditing = !!editingAccount;
    const isPending = createMutation.isPending || updateMutation.isPending;

    useEffect(() => {
        if (!isOpen) return;

        if (editingAccount) {
            setBankAccountNo(editingAccount.bankAccountNo);
            setBankAccountName(editingAccount.bankAccountName);
            setIsDefault(editingAccount.isDefault);
            setAgreedToRefundTerms(false);
            const matchedBank = banks.find((b) => b.bin === editingAccount.bankBin);
            setSelectedBank(matchedBank || {
                bin: editingAccount.bankBin,
                name: editingAccount.bankName,
                logo: editingAccount.bankLogo || '',
                code: '',
                shortName: editingAccount.bankName
            });
        } else {
            setSelectedBank(null);
            setBankAccountNo('');
            setBankAccountName('');
            setIsDefault(false);
            setAgreedToRefundTerms(false);
        }
        setBankSearch('');
        setShowBankDropdown(false);
    }, [isOpen, editingAccount, banks]);

    const filteredBanks = useMemo(() => {
        if (!bankSearch.trim()) return banks;
        const q = bankSearch.toLowerCase();
        return banks.filter(
            (b) =>
                b.name.toLowerCase().includes(q) ||
                b.shortName.toLowerCase().includes(q) ||
                b.code.toLowerCase().includes(q)
        );
    }, [banks, bankSearch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedBank) return;
        if (!bankAccountNo.trim() || !bankAccountName.trim()) return;

        if (!agreedToRefundTerms) {
            AppToast.error('Bạn cần xác nhận cam kết thông tin tài khoản ngân hàng');
            return;
        }

        const payload = {
            bankBin: selectedBank.bin,
            bankAccountNo: bankAccountNo.trim(),
            bankAccountName: bankAccountName.trim().toUpperCase(),
            isDefault,
            agreedToRefundTerms: true
        };

        if (isEditing && editingAccount) {
            updateMutation.mutate(
                { id: editingAccount.id, data: payload },
                {
                    onSuccess: (res) => {
                        if (res.success && res.data) {
                            onSuccess?.(res.data);
                            onClose();
                        }
                    }
                }
            );
        } else {
            createMutation.mutate(payload, {
                onSuccess: (res) => {
                    if (res.success && res.data) {
                        onSuccess?.(res.data);
                        onClose();
                    }
                }
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-[#E5E8EB]">
                    <h2 className="text-[18px] font-bold text-[#212B36]">
                        {isEditing ? 'Cập nhật tài khoản' : 'Thêm tài khoản ngân hàng'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-[#454F5B]">Ngân hàng *</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowBankDropdown(!showBankDropdown)}
                                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] text-left flex items-center gap-3 hover:border-[#ee1314] transition-colors cursor-pointer"
                            >
                                {selectedBank ? (
                                    <>
                                        {selectedBank.logo && (
                                            <img src={selectedBank.logo} alt="" className="w-6 h-6 object-contain" />
                                        )}
                                        <span className="font-medium text-[#212B36]">{selectedBank.shortName || selectedBank.name}</span>
                                    </>
                                ) : (
                                    <span className="text-[#919EAB]">Chọn ngân hàng...</span>
                                )}
                                <i className="fa-solid fa-chevron-down ml-auto text-[#919EAB] text-[12px]"></i>
                            </button>

                            {showBankDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E8EB] rounded-xl shadow-lg z-10 max-h-[240px] overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-[#E5E8EB]">
                                        <input
                                            type="text"
                                            placeholder="Tìm ngân hàng..."
                                            value={bankSearch}
                                            onChange={(e) => setBankSearch(e.target.value)}
                                            className="w-full px-3 py-2 border border-[#E5E8EB] rounded-lg text-[13px] outline-none focus:border-[#ee1314]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {isLoadingBanks ? (
                                            <div className="p-4 text-center text-[13px] text-[#637381]">
                                                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải...
                                            </div>
                                        ) : filteredBanks.length === 0 ? (
                                            <div className="p-4 text-center text-[13px] text-[#637381]">Không tìm thấy ngân hàng</div>
                                        ) : (
                                            filteredBanks.map((bank) => (
                                                <button
                                                    key={bank.bin}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBank(bank);
                                                        setShowBankDropdown(false);
                                                        setBankSearch('');
                                                    }}
                                                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F4F6F8] text-left cursor-pointer"
                                                >
                                                    {bank.logo && (
                                                        <img src={bank.logo} alt="" className="w-6 h-6 object-contain" />
                                                    )}
                                                    <div>
                                                        <div className="text-[13px] font-medium text-[#212B36]">{bank.shortName}</div>
                                                        <div className="text-[11px] text-[#919EAB]">{bank.name}</div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-[#454F5B]">Số tài khoản *</label>
                        <input
                            type="text"
                            value={bankAccountNo}
                            onChange={(e) => setBankAccountNo(e.target.value.replace(/\s/g, ''))}
                            placeholder="Nhập số tài khoản"
                            className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] transition-colors"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-[#454F5B]">Tên chủ tài khoản *</label>
                        <input
                            type="text"
                            value={bankAccountName}
                            onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                            placeholder="NGUYEN VAN A"
                            className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] transition-colors uppercase"
                            required
                        />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="w-4 h-4 accent-[#ee1314] cursor-pointer shrink-0"
                        />
                        <span className="text-[14px] text-[#454F5B] font-medium">Đặt làm tài khoản mặc định</span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreedToRefundTerms}
                            onChange={(e) => setAgreedToRefundTerms(e.target.checked)}
                            className="w-4 h-4 accent-[#ee1314] cursor-pointer shrink-0 mt-1"
                            required
                        />
                        <span className="text-[13px] text-[#454F5B] leading-relaxed">{BANK_ACCOUNT_TERMS_TEXT}</span>
                    </label>

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
                            disabled={isPending || !selectedBank || !agreedToRefundTerms}
                            className="flex-1 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isPending ? (
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : isEditing ? (
                                'Cập nhật'
                            ) : (
                                'Thêm tài khoản'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
