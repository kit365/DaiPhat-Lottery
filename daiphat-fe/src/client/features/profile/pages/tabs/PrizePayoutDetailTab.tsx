"use client";

import { useRouter } from "next/navigation";
import { useRouteParams } from "@/hooks/useRouteParams";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
    useCancelPrizePayout,
    useGetPrizePayoutDetail,
} from '../../../../hooks/usePrizePayout';
import { PrizePayoutRequestStatus, formatPrizePayoutCurrency } from '../../../../../types/prize-payout.type';
import { PrizePayoutStatusStepper } from '../../../../components/prize-payout/PrizePayoutStatusStepper';
import { TransferEvidencePreview } from '../../../../../admin/pages/refund/components/TransferEvidencePreview';
import { PrizePayoutRequestModal } from '../../../../components/prize-payout/PrizePayoutRequestModal';
import { PrizePayoutComplaintButton } from '../../../../components/support/PrizePayoutComplaintButton';
import { PurchasedTicket } from '../../../../../types/lottery-ticket.type';

export const PrizePayoutDetailTab = () => {
    const { id } = useRouteParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestId = Number(id);
    const { data, isLoading } = useGetPrizePayoutDetail(requestId);
    const cancelMutation = useCancelPrizePayout();
    const [resubmitOpen, setResubmitOpen] = useState(false);

    const payout = data?.data;
    const fromComplaintId = searchParams.get('fromComplaintId');
    const sessionComplaintId = useMemo(() => {
        if (typeof window === 'undefined' || !id) return null;
        return window.sessionStorage.getItem(`prizePayoutBack:${id}`);
    }, [id]);
    const effectiveComplaintId = fromComplaintId || sessionComplaintId;
    const backToComplaintPath = effectiveComplaintId ? `/profile/complaints/${effectiveComplaintId}` : null;

    if (isLoading) {
        return (
            <div className="py-16 text-center text-[#637381]">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...
            </div>
        );
    }

    if (!payout) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#E5E8EB]">
                <p className="text-[#637381] mb-4">Không tìm thấy yêu cầu trả thưởng</p>
                <Link href="/profile/prize-payouts" className="text-[#ee1314] font-bold">Quay lại danh sách</Link>
            </div>
        );
    }

    const maxRetry = payout.maxOnlineRejectRetry ?? 3;
    const rejectCount = payout.rejectCount ?? 0;
    const onlineLocked =
        payout.onlineClaimLocked === true || payout.status === PrizePayoutRequestStatus.MANUAL_RESOLUTION;

    const resubmitTicket: PurchasedTicket | null =
        payout.status === PrizePayoutRequestStatus.REJECTED && !onlineLocked && payout.orderDetailId
            ? {
                  orderId: payout.orderId || '',
                  orderCode: payout.orderCode || '',
                  orderDetailId: payout.orderDetailId,
                  ticketId: 0,
                  serialId: payout.serialId,
                  serialNumber: payout.serialNumber,
                  numbers: payout.numbers || '',
                  stationName: payout.stationName,
                  drawDate: payout.drawDate || '',
                  price: 0,
                  purchasedAt: payout.createdAt || '',
                  drawResultStatus: 'WON',
                  matchedPrizeCode: payout.prizeCode,
                  matchedPrizeDisplayName: payout.prizeDisplayName,
                  prizeAmount: payout.grossAmount,
                  serialStatus: payout.serialStatus,
                  payoutState: payout.payoutState,
              }
            : null;

    const handleCancel = () => {
        if (!window.confirm('Hủy yêu cầu? Vé sẽ quay về trạng thái đang giữ hộ và bạn có thể gửi lại sau.')) {
            return;
        }
        cancelMutation.mutate(requestId);
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => router.push('/profile/prize-payouts')}
                        className="text-[#637381] hover:text-[#212B36] text-[14px] font-medium cursor-pointer"
                    >
                        <i className="fa-solid fa-arrow-left mr-2"></i>Danh sách trả thưởng
                    </button>
                    {backToComplaintPath && (
                        <button
                            type="button"
                            onClick={() => router.push(backToComplaintPath)}
                            className="text-[#2065D1] hover:text-[#174ea1] text-[14px] font-semibold cursor-pointer"
                        >
                            <i className="fa-solid fa-rotate-left mr-2"></i>Quay lại khiếu nại #{effectiveComplaintId}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <PrizePayoutComplaintButton payout={payout} variant="button" />
                </div>
            </div>

            <PrizePayoutStatusStepper
                status={payout.status}
                rejectCount={rejectCount}
                maxOnlineRejectRetry={maxRetry}
            />

            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 md:p-6 shadow-sm">
                <h4 className="text-[#ee1314] font-bold text-[14px] uppercase mb-4">Thông tin yêu cầu</h4>
                <div className="grid gap-3 text-[14px]">
                    <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                        <span className="text-[#637381]">Mã yêu cầu</span>
                        <span className="font-medium">{payout.requestCode}</span>
                    </div>
                    {payout.status === PrizePayoutRequestStatus.REJECTED && rejectCount > 0 && (
                        <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                            <span className="text-[#637381]">Số lần từ chối online</span>
                            <span className="font-medium">
                                {rejectCount} / {maxRetry}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                        <span className="text-[#637381]">Giá trị giải</span>
                        <span className="font-medium">{formatPrizePayoutCurrency(payout.grossAmount)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                        <span className="text-[#637381]">Thuế TNCN</span>
                        <span className="font-medium">{formatPrizePayoutCurrency(payout.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                        <span className="text-[#637381]">Hoa hồng đại lý</span>
                        <span className="font-medium">{formatPrizePayoutCurrency(payout.commissionAmount)}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                        <span className="text-[#637381]">Thực nhận</span>
                        <span className="font-bold text-[#ee1314]">
                            {formatPrizePayoutCurrency(payout.netAmount ?? payout.grossAmount)}
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                        <span className="text-[#637381]">Đài / Ngày quay</span>
                        <span className="font-medium">
                            {payout.stationName} · {payout.drawDate ? dayjs(payout.drawDate).format('DD/MM/YYYY') : '—'}
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#E5E8EB] pb-2">
                        <span className="text-[#637381]">Dãy số / Giải</span>
                        <span className="font-medium">
                            {payout.numbers} · {payout.prizeDisplayName || payout.prizeCode}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 md:p-6 shadow-sm">
                <h4 className="text-[#ee1314] font-bold text-[14px] uppercase mb-4">Tài khoản thụ hưởng</h4>
                <div className="text-[14px] flex flex-col gap-2">
                    <p><span className="text-[#637381]">Ngân hàng:</span> <strong>{payout.bankName}</strong></p>
                    <p><span className="text-[#637381]">Số TK:</span> <strong>{payout.bankAccountNumber}</strong></p>
                    <p><span className="text-[#637381]">Chủ TK:</span> <strong>{payout.accountHolderName}</strong></p>
                </div>
            </div>

            {payout.status === PrizePayoutRequestStatus.COMPLETED && payout.transferEvidenceUrl && (
                <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 md:p-6 shadow-sm">
                    <h4 className="text-[#ee1314] font-bold text-[14px] uppercase mb-4">Biên lai chuyển khoản</h4>
                    <TransferEvidencePreview imageUrl={payout.transferEvidenceUrl} />
                </div>
            )}

            {payout.status === PrizePayoutRequestStatus.REJECTED && (
                <div className="bg-[#FFF4F4] rounded-2xl border border-[#ee1314]/20 p-5 flex flex-col gap-3">
                    <p className="text-[#ee1314] font-bold">Lý do từ chối</p>
                    <p className="text-[14px] text-[#454F5B]">{payout.rejectReason || 'Không rõ'}</p>
                    {resubmitTicket && (
                        <button
                            type="button"
                            onClick={() => setResubmitOpen(true)}
                            className="self-start px-4 py-2 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] cursor-pointer"
                        >
                            Gửi yêu cầu mới
                        </button>
                    )}
                </div>
            )}

            {payout.status === PrizePayoutRequestStatus.PENDING && (
                <button
                    type="button"
                    disabled={cancelMutation.isPending}
                    onClick={handleCancel}
                    className="self-start px-4 py-2 border border-[#637381] text-[#637381] font-bold rounded-xl text-[14px] hover:border-[#ee1314] hover:text-[#ee1314] cursor-pointer"
                >
                    Hủy yêu cầu
                </button>
            )}

            {resubmitTicket && (
                <PrizePayoutRequestModal
                    isOpen={resubmitOpen}
                    onClose={() => setResubmitOpen(false)}
                    ticket={resubmitTicket}
                />
            )}
        </div>
    );
};
