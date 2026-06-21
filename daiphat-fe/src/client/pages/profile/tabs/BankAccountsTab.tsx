import { useState } from 'react';
import { UserBankAccountResponse } from '../../../../types/refund.type';
import {
    useDeleteBankAccount,
    useGetBankAccounts,
    useSetDefaultBankAccount
} from '../../../hooks/useBankAccount';
import { BankAccountFormModal } from '../../../components/refund/BankAccountFormModal';
import { AppToast } from '../../../utils/toast.util';

export const BankAccountsTab = () => {
    const { data, isLoading } = useGetBankAccounts();
    const deleteMutation = useDeleteBankAccount();
    const setDefaultMutation = useSetDefaultBankAccount();

    const [showFormModal, setShowFormModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<UserBankAccountResponse | null>(null);

    const accounts = data?.data || [];

    const handleEdit = (account: UserBankAccountResponse) => {
        setEditingAccount(account);
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setEditingAccount(null);
        setShowFormModal(true);
    };

    const handleDelete = async (account: UserBankAccountResponse) => {
        const confirmed = await AppToast.confirm(
            `Bạn có chắc muốn xóa tài khoản ${account.bankName} - ${account.bankAccountNo}?`,
            'Xóa tài khoản'
        );
        if (confirmed) {
            deleteMutation.mutate(account.id);
        }
    };

    const handleSetDefault = (account: UserBankAccountResponse) => {
        if (!account.isDefault) {
            setDefaultMutation.mutate(account.id);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[20px] font-bold text-[#212B36]">Tài khoản ngân hàng</h2>
                    <p className="text-[14px] text-[#637381] mt-1">Quản lý tài khoản nhận hoàn tiền</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-[#ee1314] text-white px-5 py-3 rounded-xl font-bold text-[14px] hover:bg-[#c80f11] transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-[#ee1314]/20"
                >
                    <i className="fa-solid fa-plus"></i>
                    Thêm tài khoản
                </button>
            </div>

            <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                {isLoading ? (
                    <div className="py-16 text-center text-[14px] text-[#637381]">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="py-16 px-6 text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-2xl">
                            <i className="fa-solid fa-building-columns"></i>
                        </div>
                        <div>
                            <p className="text-[16px] font-bold text-[#212B36]">Chưa có tài khoản ngân hàng</p>
                            <p className="text-[14px] text-[#637381] mt-1">Thêm tài khoản để nhận hoàn tiền khi yêu cầu được duyệt</p>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="bg-[#ee1314] text-white px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-[#c80f11] transition-colors cursor-pointer"
                        >
                            Thêm tài khoản ngân hàng
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-[#F4F6F8]">
                        {accounts.map((account) => (
                            <div key={account.id} className="p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[#FAFBFC] transition-colors">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E8EB] flex items-center justify-center shrink-0 p-2">
                                        {account.bankLogo ? (
                                            <img src={account.bankLogo} alt={account.bankName} className="w-full h-full object-contain" />
                                        ) : (
                                            <i className="fa-solid fa-building-columns text-[#637381]"></i>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-bold text-[#212B36]">{account.bankName}</span>
                                            {account.isDefault && (
                                                <span className="text-[10px] font-bold text-[#ee1314] bg-[#FFF4F4] px-2 py-0.5 rounded-md border border-[#FFEBEE]">
                                                    Mặc định
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[14px] text-[#637381] mt-0.5 font-mono">{account.bankAccountNo}</p>
                                        <p className="text-[13px] text-[#919EAB] mt-0.5">{account.bankAccountName}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:justify-end">
                                    {!account.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(account)}
                                            disabled={setDefaultMutation.isPending}
                                            className="px-3 py-2 rounded-lg border border-[#E5E8EB] text-[12px] font-bold text-[#637381] hover:border-[#ee1314] hover:text-[#ee1314] transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            Đặt mặc định
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(account)}
                                        className="w-9 h-9 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#637381] hover:text-[#2065D1] hover:border-[#2065D1] transition-colors cursor-pointer"
                                        title="Chỉnh sửa"
                                    >
                                        <i className="fa-regular fa-pen-to-square text-[13px]"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(account)}
                                        disabled={deleteMutation.isPending}
                                        className="w-9 h-9 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#637381] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors cursor-pointer disabled:opacity-50"
                                        title="Xóa"
                                    >
                                        <i className="fa-regular fa-trash-can text-[13px]"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BankAccountFormModal
                isOpen={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setEditingAccount(null);
                }}
                editingAccount={editingAccount}
            />
        </div>
    );
};
