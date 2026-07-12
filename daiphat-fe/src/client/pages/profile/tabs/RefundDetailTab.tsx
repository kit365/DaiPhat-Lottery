import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAttachRefundBankAccount, useGetRefundDetail } from '../../../hooks/useRefund';
import { useGetBankAccounts } from '../../../hooks/useBankAccount';
import { RefundRequestStatus, RefundType, isRefundTransferComplete, maskBankAccountNo } from '../../../../types/refund.type';
import { RefundStatusBadge } from '../../../components/refund/RefundStatusBadge';
import { RefundStatusStepper } from '../../../components/refund/RefundStatusStepper';
import { TransferEvidencePreview } from '../../../../admin/pages/refund/components/TransferEvidencePreview';
import {
    UnavailableReferenceState,
    UNAVAILABLE_REFERENCE_MESSAGE,
} from '../../../components/notification/UnavailableReferenceState';

const REFUND_TYPE_LABELS: Record<RefundType, string> = {
    [RefundType.FULL_ORDER]: 'Hoàn cả đơn',
    [RefundType.ORDER_DETAIL]: 'Hoàn từng vé'
};

export const RefundDetailTab = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const refundId = Number(id);

    const { data, isLoading, isError } = useGetRefundDetail(refundId);
    const attachBankMutation = useAttachRefundBankAccount();
    const [selectedBankId, setSelectedBankId] = useState<number | ''>('');

    const refund = data?.data;
    const { data: banksRes } = useGetBankAccounts(refund?.status === RefundRequestStatus.WAITING_FOR_INFO);
    const myBanks = banksRes?.data || [];

    const handleAttachBank = () => {
        if (selectedBankId === '') return;
        attachBankMutation.mutate({ id: refundId, bankAccountId: selectedBankId });
    };

    if (isLoading) {
        return (
            <div className="py-16 text-center text-[14px] text-[#637381]">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải chi tiết...
            </div>
        );
    }

    if (isError || !refund) {
        return (
            <UnavailableReferenceState
                title="Thông báo không còn hiệu lực"
                message={data?.message || UNAVAILABLE_REFERENCE_MESSAGE}
                primaryTo="/profile/notifications"
                primaryLabel="Về danh sách thông báo"
                secondaryTo="/profile/refunds"
                secondaryLabel="Xem yêu cầu hoàn tiền"
            />
        );
    }

    const bankAccount = refund.bankAccount;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                    <button
                        onClick={() => navigate('/profile/refunds')}
                        className="text-[13px] text-[#637381] hover:text-[#ee1314] font-medium flex items-center gap-1.5 mb-2 cursor-pointer"
                    >
                        <i className="fa-solid fa-arrow-left text-[11px]"></i> Quay lại danh sách
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-[22px] font-bold text-[#212B36]">Yêu cầu hoàn tiền #{refund.id}</h2>
                        <RefundStatusBadge status={refund.status} />
                    </div>
                    <p className="text-[14px] text-[#637381] mt-1">
                        Tạo lúc {format(new Date(refund.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                </div>
            </div>

            <RefundStatusStepper
                status={refund.status}
                requestRole={refund.requestRole}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-file-invoice"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Thông tin yêu cầu</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t border-[#F4F6F8] pt-5">
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Loại hoàn tiền</span>
                            <span className="text-[15px] font-semibold text-[#212B36]">
                                {REFUND_TYPE_LABELS[refund.refundType]}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Đơn hàng liên quan</span>
                            {refund.orderId ? (
                                <Link
                                    to={`/profile/orders/${refund.orderId}`}
                                    className="text-[15px] font-semibold text-[#2065D1] hover:underline w-max"
                                >
                                    {refund.orderCode?.trim() || 'Xem đơn hàng'}
                                </Link>
                            ) : (
                                <span className="text-[15px] font-semibold text-[#919EAB]">
                                    {refund.orderCode?.trim() || '—'}
                                </span>
                            )}
                        </div>
                        {(refund.orderDetailIds?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[13px] text-[#637381]">Số chi tiết vé trong yêu cầu</span>
                                <span className="text-[15px] font-semibold text-[#212B36]">
                                    {refund.orderDetailIds!.length} vé
                                </span>
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Số tiền hoàn</span>
                            <span className="text-[22px] font-bold text-[#ee1314]">
                                {refund.refundAmount.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Lý do hoàn tiền</span>
                            <span className="text-[15px] font-medium text-[#212B36] leading-relaxed">{refund.refundReason}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-building-columns"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Tài khoản nhận hoàn</h3>
                    </div>

                    {bankAccount ? (
                        <div className="border-t border-[#F4F6F8] pt-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E8EB] flex items-center justify-center p-2 shrink-0">
                                {bankAccount.bankLogo ? (
                                    <img src={bankAccount.bankLogo} alt="" className="w-full h-full object-contain" />
                                ) : (
                                    <i className="fa-solid fa-building-columns text-[#637381]"></i>
                                )}
                            </div>
                            <div>
                                <p className="text-[15px] font-bold text-[#212B36]">{bankAccount.bankName}</p>
                                <p className="text-[14px] text-[#637381] font-mono mt-0.5">
                                    {maskBankAccountNo(bankAccount.bankAccountNo)}
                                </p>
                                <p className="text-[13px] text-[#919EAB] mt-0.5">{bankAccount.bankAccountName}</p>
                            </div>
                        </div>
                    ) : refund.status === RefundRequestStatus.WAITING_FOR_INFO ? (
                        <div className="border-t border-[#F4F6F8] pt-5 flex flex-col gap-4">
                            <p className="text-[14px] text-[#B76E00]">
                                Đơn đã được hủy do sự cố. Vui lòng chọn tài khoản ngân hàng để nhận hoàn tiền.
                            </p>
                            {myBanks.length === 0 ? (
                                <div className="flex flex-col gap-2">
                                    <p className="text-[14px] text-[#637381]">Bạn chưa có tài khoản ngân hàng đã lưu.</p>
                                    <Link
                                        to="/profile/bank-accounts"
                                        className="text-[14px] font-bold text-[#2065D1] hover:underline w-max"
                                    >
                                        Thêm tài khoản ngân hàng
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <select
                                        className="w-full rounded-xl border border-[#E5E8EB] px-4 py-3 text-[14px] text-[#212B36] bg-white"
                                        value={selectedBankId}
                                        onChange={(e) =>
                                            setSelectedBankId(e.target.value ? Number(e.target.value) : '')
                                        }
                                    >
                                        <option value="">Chọn tài khoản nhận hoàn</option>
                                        {myBanks.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.bankName} — {maskBankAccountNo(account.bankAccountNo)} (
                                                {account.bankAccountName})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAttachBank}
                                        disabled={selectedBankId === '' || attachBankMutation.isPending}
                                        className="inline-flex items-center justify-center gap-2 self-start px-4 py-2.5 rounded-xl bg-[#ee1314] text-white text-[13px] font-bold hover:bg-[#c62828] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {attachBankMutation.isPending ? (
                                            <i className="fa-solid fa-spinner fa-spin" />
                                        ) : (
                                            <i className="fa-solid fa-check" />
                                        )}
                                        Xác nhận tài khoản
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="text-[14px] text-[#637381] border-t border-[#F4F6F8] pt-5">Không có thông tin tài khoản</p>
                    )}
                </div>
            </div>

            {isRefundTransferComplete(refund.status) && (
                <div className="bg-[#E4F8ED] rounded-[20px] p-6 lg:p-8 border border-[#1CD162]/20 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1CD162] text-white flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Đã chuyển khoản</h3>
                    </div>
                    {refund.payoutTransaction?.paidAt && (
                        <p className="text-[14px] text-[#637381]">
                            Thời gian: {format(new Date(refund.payoutTransaction.paidAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                    )}
                    {refund.payoutTransaction?.note && (
                        <p className="text-[14px] text-[#637381]">
                            Ghi chú: {refund.payoutTransaction.note}
                        </p>
                    )}
                    {refund.payoutTransaction?.paymentEvidenceUrl ? (
                        <div className="mt-1 bg-white rounded-2xl p-4 border border-[#E5E8EB]">
                            <TransferEvidencePreview
                                imageUrl={refund.payoutTransaction.paymentEvidenceUrl}
                                infoItems={[
                                    {
                                        label: 'Mã yêu cầu',
                                        value: `#${refund.id}`,
                                    },
                                    {
                                        label: 'Số tiền hoàn',
                                        value: `${Number(refund.refundAmount || 0).toLocaleString('vi-VN')}đ`,
                                    },
                                    {
                                        label: 'Thời gian',
                                        value: refund.payoutTransaction.paidAt
                                            ? format(
                                                  new Date(refund.payoutTransaction.paidAt),
                                                  'dd/MM/yyyy HH:mm'
                                              )
                                            : '—',
                                    },
                                ]}
                            />
                        </div>
                    ) : (
                        <p className="text-[14px] text-[#637381]">Chưa có ảnh biên lai chuyển khoản.</p>
                    )}
                </div>
            )}

            {refund.reviewedAt && (
                <div className="text-center text-[13px] text-[#919EAB]">
                    Cập nhật lần cuối: {format(new Date(refund.updatedAt), 'dd/MM/yyyy HH:mm')}
                </div>
            )}
        </div>
    );
};
