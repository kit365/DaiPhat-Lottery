"use client";

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useAttachRefundBankAccount, useGetRefundDetail } from '../../../../hooks/useRefund';
import { useGetBankAccounts } from '../../../../hooks/useBankAccount';
import {
    RefundRequestStatus,
    RefundType,
    UserBankAccountResponse,
    isRefundTransferComplete,
    maskBankAccountNo,
} from '../../../../../types/refund.type';
import { RefundStatusBadge } from '../../../../components/refund/RefundStatusBadge';
import { RefundStatusStepper } from '../../../../components/refund/RefundStatusStepper';
import { RefundComplaintButton } from '../../../../components/support/RefundComplaintButton';
import { BankAccountFormModal } from '../../../../components/refund/BankAccountFormModal';
import { TransferEvidencePreview } from '../../../../../admin/pages/refund/components/TransferEvidencePreview';
import {
    UnavailableReferenceState,
    UNAVAILABLE_REFERENCE_MESSAGE,
} from '../../../../components/notification/UnavailableReferenceState';
import { QUERY_KEYS } from '../../../../../constants/queryKeys';

const REFUND_TYPE_LABELS: Record<RefundType, string> = {
    [RefundType.FULL_ORDER]: 'Hoàn cả đơn',
    [RefundType.ORDER_DETAIL]: 'Hoàn từng vé'
};

const FALLBACK_TICKET_IMG =
    'https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png';

function resolveIncidentReason(serialStatus?: string | null): string | null {
    if (serialStatus === 'DAMAGED') return 'Vé bị rách/hư hỏng';
    if (serialStatus === 'LOST') return 'Vé bị thất lạc';
    return null;
}

export const RefundDetailTab = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const refundId = Number(id);

    const { data, isLoading, isError } = useGetRefundDetail(refundId);
    const attachBankMutation = useAttachRefundBankAccount();
    const [selectedBankId, setSelectedBankId] = useState<number | ''>('');
    const [bankFormOpen, setBankFormOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<UserBankAccountResponse | null>(null);

    const refund = data?.data;
    const needsBankUpdate = refund?.status === RefundRequestStatus.WAITING_FOR_INFO;
    const { data: banksRes } = useGetBankAccounts(needsBankUpdate);
    const myBanks = banksRes?.data || [];

    const handleAttachBank = (bankAccountId?: number) => {
        const idToAttach =
            bankAccountId ??
            (selectedBankId !== '' ? selectedBankId : undefined);
        if (idToAttach == null) return;
        attachBankMutation.mutate({ id: refundId, bankAccountId: idToAttach });
    };

    const openCreateBankForm = () => {
        setEditingAccount(null);
        setBankFormOpen(true);
    };

    const openEditBankForm = (account: UserBankAccountResponse) => {
        setEditingAccount(account);
        setBankFormOpen(true);
    };

    const handleBankFormSuccess = (account: UserBankAccountResponse) => {
        setSelectedBankId(account.id);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_REFUND_DETAIL, refundId] });
        handleAttachBank(account.id);
    };

    const bankAccount = refund?.bankAccount;
    const isWaitingForBankInfo = refund?.status === RefundRequestStatus.WAITING_FOR_INFO;
    const isBankRetryRequest = Boolean(isWaitingForBankInfo && (refund?.retryCount ?? 0) > 0);

    const editableCurrentAccount = useMemo(() => {
        if (!isWaitingForBankInfo) return null;
        if (selectedBankId !== '') {
            return myBanks.find((account) => account.id === selectedBankId) || null;
        }
        if (bankAccount?.id != null) {
            return myBanks.find((account) => account.id === bankAccount.id) || bankAccount;
        }
        return null;
    }, [isWaitingForBankInfo, selectedBankId, myBanks, bankAccount]);

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
                <RefundComplaintButton refund={refund} variant="button" />
            </div>

            {refund.status !== RefundRequestStatus.MANUAL_RESOLUTION && (
                <RefundStatusStepper
                    status={refund.status}
                    requestRole={refund.requestRole}
                />
            )}

            {refund.status === RefundRequestStatus.WAITING_FOR_INFO && (
                <div className="rounded-[20px] p-5 lg:p-6 border border-[#FFB020]/40 bg-[#FFF9F3] flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFB020]/15 text-[#B76E00] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[16px] font-bold text-[#B76E00]">
                                Cần cập nhật tài khoản ngân hàng
                            </h3>
                            <p className="text-[14px] text-[#637381] mt-1 leading-relaxed whitespace-pre-wrap">
                                {refund.operatorNote?.trim()
                                    || 'Vui lòng cung cấp hoặc chọn lại tài khoản ngân hàng để nhận hoàn tiền.'}
                            </p>
                            <p className="text-[13px] font-semibold text-[#212B36] mt-2 tabular-nums">
                                Số lần yêu cầu cập nhật: {refund.retryCount ?? 0} / {refund.maxRefundBankInfoRetry ?? 3}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {refund.status === RefundRequestStatus.MANUAL_RESOLUTION && (
                <div className="rounded-[20px] p-5 lg:p-6 border border-[#FECACA] bg-[#FFF5F5] flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#C62828] text-white flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-headset"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[16px] font-bold text-[#C62828]">
                                Cần xử lý thủ công
                            </h3>
                            <p className="text-[14px] text-[#637381] mt-1 leading-relaxed">
                                Yêu cầu hoàn tiền này không thể xử lý trực tuyến. Vui lòng mang CCCD đến
                                quầy hỗ trợ hoặc liên hệ CSKH để được hỗ trợ trong thời gian sớm nhất.
                            </p>
                            <p className="text-[13px] text-[#637381] mt-2">
                                Bạn không thể cập nhật tài khoản ngân hàng trên hệ thống cho yêu cầu này nữa.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                        {(refund.refundTickets?.length ?? 0) > 0 ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] text-[#637381]">Vé trong yêu cầu hoàn tiền</span>
                                    <span className="text-[12px] font-bold text-[#212B36] bg-[#F4F6F8] px-2.5 py-1 rounded-lg">
                                        {refund.refundTickets!.length} vé
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {refund.refundTickets!.map((ticket, index) => {
                                        const drawDateLabel = ticket.drawDate
                                            ? format(new Date(ticket.drawDate), 'dd/MM/yyyy')
                                            : '—';
                                        const incidentReason = ticket.hasIncident
                                            ? resolveIncidentReason(ticket.serialStatus)
                                            : null;
                                        return (
                                            <div
                                                key={ticket.orderDetailId ?? index}
                                                className="rounded-2xl border border-[#E5E8EB] bg-[#FCFCFD] p-4 flex flex-col gap-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-[72px] h-[46px] rounded-lg shrink-0 overflow-hidden border border-[#E5E8EB] bg-white">
                                                        <img
                                                            src={ticket.ticketImg || FALLBACK_TICKET_IMG}
                                                            alt={`Vé ${ticket.stationName || ''}`}
                                                            className="w-full h-full object-cover mix-blend-multiply"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[17px] font-bold text-[#212B36] tracking-tight">
                                                            {ticket.numbers || '—'}
                                                        </p>
                                                        {ticket.serialNumber && (
                                                            <p className="text-[12px] text-[#637381] font-mono mt-0.5">
                                                                SN: {ticket.serialNumber}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 text-[13px]">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[#919EAB]">Đài phát hành</span>
                                                        <span className="font-semibold text-[#212B36]">
                                                            {ticket.stationName || '—'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[#919EAB]">Ngày quay</span>
                                                        <span className="font-semibold text-[#212B36]">{drawDateLabel}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[#919EAB]">Số lượng</span>
                                                        <span className="font-semibold text-[#212B36]">
                                                            {ticket.quantity || 1}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[#919EAB]">Thành tiền</span>
                                                        <span className="font-bold text-[#ee1314]">
                                                            {(ticket.subtotalAmount ?? 0).toLocaleString('vi-VN')}đ
                                                        </span>
                                                    </div>
                                                    {incidentReason && (
                                                        <div className="flex flex-col gap-0.5 col-span-2">
                                                            <span className="text-[#919EAB]">Lý do sự cố</span>
                                                            <span className="font-semibold text-[#C62828]">
                                                                {incidentReason}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (refund.orderDetailIds?.length ?? 0) > 0 ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-[13px] text-[#637381]">Số chi tiết vé trong yêu cầu</span>
                                <span className="text-[15px] font-semibold text-[#212B36]">
                                    {refund.orderDetailIds!.length} vé
                                </span>
                            </div>
                        ) : null}
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

                <div
                    className={`rounded-[20px] p-6 lg:p-8 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5 ${
                        isWaitingForBankInfo
                            ? 'bg-[#FFF9F3] border-2 border-[#FFB020] ring-1 ring-[#FFB020]/20'
                            : 'bg-white border border-[#E5E8EB]'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                                isWaitingForBankInfo
                                    ? 'bg-[#FFB020]/15 text-[#B76E00]'
                                    : 'bg-[#FFF4F4] text-[#ee1314]'
                            }`}
                        >
                            <i className="fa-solid fa-building-columns"></i>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[18px] font-bold text-[#212B36]">Tài khoản nhận hoàn</h3>
                            {isWaitingForBankInfo && (
                                <p className="text-[12px] font-semibold text-[#B76E00] mt-0.5">
                                    Cần kiểm tra / cập nhật
                                </p>
                            )}
                        </div>
                    </div>

                    {isWaitingForBankInfo && (
                        <div className="rounded-xl border border-[#FFB020]/35 bg-white/80 px-4 py-3">
                            <p className="text-[13px] text-[#637381] leading-relaxed">
                                {isBankRetryRequest
                                    ? 'Vui lòng kiểm tra và cập nhật thông tin tài khoản ngân hàng. Giao dịch hoàn tiền chưa thể thực hiện vì thông tin tài khoản đã cung cấp trước đó không hợp lệ.'
                                    : 'Đơn đã được hủy do sự cố. Vui lòng chọn hoặc thêm tài khoản ngân hàng để nhận hoàn tiền.'}
                            </p>
                            {refund.operatorNote?.trim() && (
                                <p className="text-[13px] text-[#212B36] mt-2 leading-relaxed whitespace-pre-wrap">
                                    <span className="font-semibold text-[#B76E00]">Ghi chú từ nhân viên: </span>
                                    {refund.operatorNote.trim()}
                                </p>
                            )}
                        </div>
                    )}

                    {bankAccount && (
                        <div
                            className={`pt-5 flex items-start justify-between gap-3 ${
                                isWaitingForBankInfo ? 'border-t border-[#FFB020]/25' : 'border-t border-[#F4F6F8]'
                            }`}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E8EB] flex items-center justify-center p-2 shrink-0">
                                    {bankAccount.bankLogo ? (
                                        <img src={bankAccount.bankLogo} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                        <i className="fa-solid fa-building-columns text-[#637381]"></i>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[15px] font-bold text-[#212B36]">{bankAccount.bankName}</p>
                                    <p className="text-[14px] text-[#637381] font-mono mt-0.5">
                                        {maskBankAccountNo(bankAccount.bankAccountNo)}
                                    </p>
                                    <p className="text-[13px] text-[#919EAB] mt-0.5">{bankAccount.bankAccountName}</p>
                                </div>
                            </div>
                            {isWaitingForBankInfo && editableCurrentAccount && (
                                <button
                                    type="button"
                                    onClick={() => openEditBankForm(editableCurrentAccount)}
                                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#FFB020] text-[#B76E00] text-[12px] font-bold bg-white hover:bg-[#FFF4E5] cursor-pointer"
                                >
                                    <i className="fa-solid fa-pen-to-square text-[11px]"></i>
                                    Sửa
                                </button>
                            )}
                        </div>
                    )}

                    {isWaitingForBankInfo ? (
                        <div className={`${bankAccount ? 'pt-2' : 'border-t border-[#FFB020]/25 pt-5'} flex flex-col gap-4`}>
                            {myBanks.length === 0 ? (
                                <div className="flex flex-col gap-3">
                                    <p className="text-[14px] text-[#637381]">Bạn chưa có tài khoản ngân hàng đã lưu.</p>
                                    <button
                                        type="button"
                                        onClick={openCreateBankForm}
                                        className="inline-flex items-center justify-center gap-2 self-start px-4 py-2.5 rounded-xl bg-[#ee1314] text-white text-[13px] font-bold hover:bg-[#c62828] cursor-pointer"
                                    >
                                        <i className="fa-solid fa-plus"></i>
                                        Thêm tài khoản ngân hàng
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-semibold text-[#212B36]">
                                            Chọn tài khoản khác
                                        </label>
                                        <select
                                            className="w-full rounded-xl border border-[#E5E8EB] px-4 py-3 text-[14px] text-[#212B36] bg-white"
                                            value={selectedBankId}
                                            onChange={(e) =>
                                                setSelectedBankId(e.target.value ? Number(e.target.value) : '')
                                            }
                                        >
                                            <option value="">
                                                {bankAccount
                                                    ? 'Giữ tài khoản hiện tại hoặc chọn tài khoản khác'
                                                    : 'Chọn tài khoản nhận hoàn'}
                                            </option>
                                            {myBanks.map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.bankName} — {maskBankAccountNo(account.bankAccountNo)} (
                                                    {account.bankAccountName})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleAttachBank(
                                                    selectedBankId !== ''
                                                        ? selectedBankId
                                                        : bankAccount?.id
                                                )
                                            }
                                            disabled={
                                                (selectedBankId === '' && !bankAccount?.id) ||
                                                attachBankMutation.isPending
                                            }
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ee1314] text-white text-[13px] font-bold hover:bg-[#c62828] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            {attachBankMutation.isPending ? (
                                                <i className="fa-solid fa-spinner fa-spin" />
                                            ) : (
                                                <i className="fa-solid fa-check" />
                                            )}
                                            {selectedBankId === '' && bankAccount?.id
                                                ? 'Xác nhận tài khoản đã sửa'
                                                : 'Gửi cập nhật tài khoản'}
                                        </button>
                                        {editableCurrentAccount && (
                                            <button
                                                type="button"
                                                onClick={() => openEditBankForm(editableCurrentAccount)}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#FFB020] text-[#B76E00] text-[13px] font-bold bg-white hover:bg-[#FFF4E5] cursor-pointer"
                                            >
                                                <i className="fa-solid fa-pen-to-square"></i>
                                                Sửa tài khoản
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={openCreateBankForm}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2065D1] text-[#2065D1] text-[13px] font-bold bg-white hover:bg-[#F0F5FF] cursor-pointer"
                                        >
                                            <i className="fa-solid fa-plus"></i>
                                            Thêm tài khoản mới
                                        </button>
                                    </div>
                                    <p className="text-[12px] text-[#919EAB] leading-relaxed">
                                        Bạn có thể chọn tài khoản khác, sửa thông tin tài khoản hiện có, hoặc thêm tài
                                        khoản mới. Sau khi chỉnh sửa xong, nhấn gửi cập nhật để tiếp tục nhận hoàn tiền.
                                    </p>
                                </>
                            )}
                        </div>
                    ) : !bankAccount ? (
                        <p className="text-[14px] text-[#637381] border-t border-[#F4F6F8] pt-5">Không có thông tin tài khoản</p>
                    ) : null}
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

            <BankAccountFormModal
                isOpen={bankFormOpen}
                editingAccount={editingAccount}
                onClose={() => {
                    setBankFormOpen(false);
                    setEditingAccount(null);
                }}
                onSuccess={handleBankFormSuccess}
            />
        </div>
    );
};
