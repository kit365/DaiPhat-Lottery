"use client";

import { useRouter } from "next/navigation";
import { useRouteParams } from "@/hooks/useRouteParams";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
    useCancelPrizePayout,
    useGetPrizePayoutDetail,
} from '../../../../hooks/usePrizePayout';
import {
    PrizePayoutRequestStatus,
    formatPrizePayoutCurrency,
} from '../../../../../types/prize-payout.type';
import { PrizePayoutStatusStepper } from '../../../../components/prize-payout/PrizePayoutStatusStepper';
import { PrizePayoutRequestModal } from '../../../../components/prize-payout/PrizePayoutRequestModal';
import { LuckyNumber } from '../../../../components/ui/LuckyNumber';
import { PrizePayoutComplaintButton } from '../../../../components/support/PrizePayoutComplaintButton';
import { PurchasedTicket } from '../../../../../types/lottery-ticket.type';
import { AppToast as toast } from '../../../../../utils/toast.util';

export const PrizePayoutDetailTab = () => {
    const { id } = useRouteParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestId = Number(id);
    const { data, isLoading } = useGetPrizePayoutDetail(requestId);
    const cancelMutation = useCancelPrizePayout();
    const [resubmitOpen, setResubmitOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
    const lastStatusRef = useRef<PrizePayoutRequestStatus | null>(null);

    const payout = data?.data;

    useEffect(() => {
        const nextStatus = payout?.status;
        if (!nextStatus) return;
        const prev = lastStatusRef.current;
        lastStatusRef.current = nextStatus;
        if (prev && prev !== nextStatus) {
            if (nextStatus === PrizePayoutRequestStatus.COMPLETED) {
                toast.success('Trả thưởng thành công! Tiền thưởng đã được chuyển vào tài khoản của bạn.');
            } else if (nextStatus === PrizePayoutRequestStatus.REJECTED) {
                toast.error('Yêu cầu trả thưởng đã bị từ chối.');
            }
        }
    }, [payout?.status]);

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

    const hasCccdInfo = Boolean(
        payout.recipientFullName ||
        payout.recipientIdNumber ||
        payout.recipientIdImageUrl ||
        payout.recipientIdImageBackUrl ||
        payout.ekycOcrName ||
        payout.ekycOcrIdNumber ||
        payout.ekycOcrDob
    );

    return (
        <div className="flex flex-col gap-5">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => router.push('/profile/prize-payouts')}
                        className="text-[#637381] hover:text-[#212B36] text-[14px] font-medium cursor-pointer transition-colors"
                    >
                        <i className="fa-solid fa-arrow-left mr-2"></i>Danh sách trả thưởng
                    </button>
                    {backToComplaintPath && (
                        <button
                            type="button"
                            onClick={() => router.push(backToComplaintPath)}
                            className="text-[#2065D1] hover:text-[#174ea1] text-[14px] font-semibold cursor-pointer transition-colors"
                        >
                            <i className="fa-solid fa-rotate-left mr-2"></i>Quay lại khiếu nại #{effectiveComplaintId}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <PrizePayoutComplaintButton payout={payout} variant="button" />
                </div>
            </div>

            {/* Status Stepper Banner */}
            <PrizePayoutStatusStepper
                status={payout.status}
                rejectCount={rejectCount}
                maxOnlineRejectRetry={maxRetry}
                transferEvidenceUrl={payout.transferEvidenceUrl}
                completedAt={payout.completedAt}
                requestCode={payout.requestCode}
                netAmount={payout.netAmount ?? payout.grossAmount}
            />

            {/* Card 1: Thông tin vé & trúng thưởng */}
            <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden shadow-xs">
                {/* Station & Draw Date Header */}
                <div className="bg-[#F9FAFB] px-5 py-3.5 border-b border-[#E5E8EB] flex items-center justify-between flex-wrap gap-2.5">
                    <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-red-50 text-[#ee1314] flex items-center justify-center text-[15px] shrink-0 border border-red-100">
                            <i className="fa-solid fa-ticket" />
                        </span>
                        <div>
                            <span className="text-[11px] text-[#919EAB] uppercase font-bold tracking-wider leading-none block">
                                Nhà đài mở thưởng
                            </span>
                            <span className="text-[15px] font-bold text-[#212B36] mt-0.5 block">
                                {payout.stationName || '—'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E5E8EB] text-[#637381] text-[13px] font-medium shadow-2xs">
                        <i className="fa-regular fa-calendar-days text-[#ee1314]" />
                        <span>Ngày quay: <strong>{payout.drawDate ? dayjs(payout.drawDate).format('DD/MM/YYYY') : '—'}</strong></span>
                    </div>
                </div>

                {/* Winning Number & Prize Hero Banner */}
                <div className="p-5 flex flex-col items-center justify-center bg-gradient-to-b from-[#FFFDFD] to-[#FFF8F8] border-b border-[#F0F2F5]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#919EAB] mb-1.5">
                        Dãy số trúng thưởng
                    </span>
                    <div className="text-[28px] md:text-[32px] font-black tracking-widest text-[#ee1314] font-mono py-1">
                        <LuckyNumber value={payout.numbers} ticket className="font-mono" />
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-amber-900 text-[13px] font-bold shadow-2xs">
                        <i className="fa-solid fa-trophy text-amber-500 text-[13px]" />
                        <span>{payout.prizeDisplayName || payout.prizeCode || 'Giải thưởng'}</span>
                    </div>
                </div>

                {/* Order & Request Metadata Grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-[13px]">
                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                            Mã yêu cầu
                        </span>
                        <span className="font-mono font-bold text-[#212B36] text-[13px]">
                            {payout.requestCode}
                        </span>
                    </div>

                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                            Thời gian gửi yêu cầu
                        </span>
                        <span className="font-semibold text-[#212B36]">
                            {payout.createdAt ? dayjs(payout.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                        </span>
                    </div>

                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                            Mã đơn hàng
                        </span>
                        {payout.orderId ? (
                            <Link
                                href={`/profile/orders/${payout.orderId}`}
                                className="font-mono font-bold text-[#2065D1] hover:underline"
                            >
                                {payout.orderCode || payout.orderId}
                            </Link>
                        ) : (
                            <span className="font-mono font-bold text-[#212B36]">
                                {payout.orderCode || '—'}
                            </span>
                        )}
                    </div>

                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                            Kênh nhận thưởng
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#212B36]">
                            <i className="fa-solid fa-globe text-[#2065D1] text-[12px]" />
                            Trực tuyến (Online)
                        </span>
                    </div>

                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                            Hình thức chi trả
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#212B36]">
                            <i className="fa-solid fa-credit-card text-[#118D57] text-[12px]" />
                            Chuyển khoản ngân hàng
                        </span>
                    </div>

                    {payout.status === PrizePayoutRequestStatus.REJECTED && rejectCount > 0 && (
                        <div className="bg-[#FFF5F5] border border-[#FECDD3] rounded-xl p-3">
                            <span className="text-[11px] font-bold text-[#C62828] uppercase tracking-wider block mb-0.5">
                                Số lần từ chối trực tuyến
                            </span>
                            <span className="font-bold text-[#ee1314]">
                                {rejectCount} / {maxRetry}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Card 2: Chi tiết tiền thưởng & Thực nhận */}
            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 md:p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F0F2F5]">
                    <span className="w-7 h-7 rounded-lg bg-red-50 text-[#ee1314] flex items-center justify-center text-[13px] shrink-0">
                        <i className="fa-solid fa-wallet" />
                    </span>
                    <h4 className="text-[#212B36] font-bold text-[15px] uppercase tracking-wide">
                        Chi tiết tiền thưởng
                    </h4>
                </div>

                <div className="grid gap-2.5 text-[14px] mb-4">
                    <div className="flex justify-between items-center border-b border-dashed border-[#E5E8EB] pb-2.5">
                        <span className="text-[#637381]">Giá trị giải thưởng (Gross)</span>
                        <span className="font-bold text-[#212B36] text-[15px]">
                            {formatPrizePayoutCurrency(payout.grossAmount)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-dashed border-[#E5E8EB] pb-2.5">
                        <div className="flex items-center gap-1.5 text-[#637381]">
                            <span>Thuế TNCN</span>
                            <span className="text-[12px] text-[#919EAB]">(10% phần vượt 10 triệu)</span>
                        </div>
                        <span className={`font-semibold ${payout.taxAmount && payout.taxAmount > 0 ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                            {payout.taxAmount && payout.taxAmount > 0
                                ? `-${formatPrizePayoutCurrency(payout.taxAmount)}`
                                : '0 đ (Miễn thuế)'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-dashed border-[#E5E8EB] pb-2.5">
                        <span className="text-[#637381]">Hoa hồng đại lý</span>
                        <span className={`font-semibold ${payout.commissionAmount && payout.commissionAmount > 0 ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                            {payout.commissionAmount && payout.commissionAmount > 0
                                ? `-${formatPrizePayoutCurrency(payout.commissionAmount)}`
                                : '0 đ'}
                        </span>
                    </div>
                </div>

                {/* Net Amount Highlight Box */}
                <div className="rounded-xl bg-gradient-to-r from-[#FFF5F5] via-[#FFF0F0] to-[#FFEBEB] border border-[#FFCDD2] p-4 md:p-5 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
                    <div>
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#C62828] block">
                            Số tiền thực nhận chuyển khoản
                        </span>
                        <p className="text-[12px] text-[#D32F2F] mt-0.5 mb-0">
                            Số tiền chuyển trực tiếp về tài khoản ngân hàng của bạn
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[24px] md:text-[28px] font-black text-[#ee1314] tracking-tight">
                            {formatPrizePayoutCurrency(payout.netAmount ?? payout.grossAmount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 3: Tài khoản ngân hàng nhận tiền */}
            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 md:p-6 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F0F2F5] flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#0068FF] flex items-center justify-center text-[13px] shrink-0">
                            <i className="fa-solid fa-building-columns" />
                        </span>
                        <h4 className="text-[#212B36] font-bold text-[15px] uppercase tracking-wide">
                            Tài khoản thụ hưởng
                        </h4>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#0068FF] border border-blue-100 text-[12px] font-semibold">
                        <i className="fa-solid fa-bolt text-[11px]" />
                        Chuyển nhanh 24/7
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-[14px]">
                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-1">
                            Ngân hàng nhận
                        </span>
                        <span className="font-bold text-[#212B36] text-[15px]">
                            {payout.bankName || '—'}
                        </span>
                    </div>

                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-1">
                            Số tài khoản
                        </span>
                        <span className="font-mono font-bold text-[#212B36] text-[16px] tracking-wider">
                            {payout.bankAccountNumber || '—'}
                        </span>
                    </div>

                    <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-1">
                            Chủ tài khoản
                        </span>
                        <span className="font-bold uppercase text-[#212B36] text-[15px]">
                            {payout.accountHolderName || '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 4: Thông tin CCCD đã xác thực & Ảnh mặt trước/sau */}
            {hasCccdInfo && (
                <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 md:p-6 shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F0F2F5] flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#118D57] flex items-center justify-center text-[13px] shrink-0">
                                <i className="fa-solid fa-id-card" />
                            </span>
                            <h4 className="text-[#212B36] font-bold text-[15px] uppercase tracking-wide">
                                Thông tin căn cước công dân
                            </h4>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4F8ED] text-[#118D57] border border-[#A6E9C8] text-[12px] font-bold">
                            <i className="fa-solid fa-circle-check text-[12px]" />
                            Đã xác thực CCCD
                        </span>
                    </div>

                    {/* OCR Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                        <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                            <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                Họ và tên
                            </span>
                            <span className="font-bold text-[#212B36] text-[14px]">
                                {payout.recipientFullName || payout.ekycOcrName || '—'}
                            </span>
                        </div>

                        <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                            <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                Số CCCD / CMND
                            </span>
                            <span className="font-mono font-bold text-[#212B36] text-[14px] tracking-wide">
                                {payout.recipientIdNumber || payout.ekycOcrIdNumber || '—'}
                            </span>
                        </div>

                        <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                            <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                Ngày sinh
                            </span>
                            <span className="font-semibold text-[#212B36] text-[14px]">
                                {payout.ekycOcrDob || '—'}
                            </span>
                        </div>

                        <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                            <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                Giới tính
                            </span>
                            <span className="font-semibold text-[#212B36] text-[14px]">
                                {payout.ekycOcrGender || '—'}
                            </span>
                        </div>

                        <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                            <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                Quốc tịch
                            </span>
                            <span className="font-semibold text-[#212B36] text-[14px]">
                                {payout.ekycOcrNationality || 'Việt Nam'}
                            </span>
                        </div>

                        <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3">
                            <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                Ngày hết hạn
                            </span>
                            <span className="font-semibold text-[#212B36] text-[14px]">
                                {payout.ekycOcrExpiryDate || '—'}
                            </span>
                        </div>

                        {payout.ekycOcrPlaceOfBirth && (
                            <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3 sm:col-span-2 lg:col-span-3">
                                <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                    Quê quán / Nơi khai sinh
                                </span>
                                <span className="font-semibold text-[#212B36] text-[14px]">
                                    {payout.ekycOcrPlaceOfBirth}
                                </span>
                            </div>
                        )}

                        {payout.ekycOcrPlaceOfResidence && (
                            <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3 sm:col-span-2 lg:col-span-3">
                                <span className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                                    Nơi thường trú
                                </span>
                                <span className="font-semibold text-[#212B36] text-[14px]">
                                    {payout.ekycOcrPlaceOfResidence}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Attached CCCD Photos */}
                    {(payout.recipientIdImageUrl || payout.recipientIdImageBackUrl) && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="text-[12px] font-bold text-[#637381] uppercase tracking-wider">
                                    Ảnh CCCD đã tải lên
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {payout.recipientIdImageUrl && (
                                    <div
                                        className="group relative rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-2.5 overflow-hidden transition-all hover:border-[#2065D1] hover:shadow-md cursor-pointer"
                                        onClick={() => setPreviewImage({
                                            url: payout.recipientIdImageUrl!,
                                            title: 'Ảnh CCCD - Mặt trước',
                                        })}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#2065D1] text-white">
                                                MẶT TRƯỚC
                                            </span>
                                            <span className="text-[12px] text-[#2065D1] font-semibold flex items-center gap-1 group-hover:underline">
                                                <i className="fa-solid fa-magnifying-glass-plus" /> Xem to
                                            </span>
                                        </div>
                                        <div className="w-full h-44 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
                                            <img
                                                src={payout.recipientIdImageUrl}
                                                alt="CCCD Mặt trước"
                                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                            />
                                        </div>
                                    </div>
                                )}

                                {payout.recipientIdImageBackUrl && (
                                    <div
                                        className="group relative rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] p-2.5 overflow-hidden transition-all hover:border-[#2065D1] hover:shadow-md cursor-pointer"
                                        onClick={() => setPreviewImage({
                                            url: payout.recipientIdImageBackUrl!,
                                            title: 'Ảnh CCCD - Mặt sau',
                                        })}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#2065D1] text-white">
                                                MẶT SAU
                                            </span>
                                            <span className="text-[12px] text-[#2065D1] font-semibold flex items-center gap-1 group-hover:underline">
                                                <i className="fa-solid fa-magnifying-glass-plus" /> Xem to
                                            </span>
                                        </div>
                                        <div className="w-full h-44 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
                                            <img
                                                src={payout.recipientIdImageBackUrl}
                                                alt="CCCD Mặt sau"
                                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Rejection Alert */}
            {payout.status === PrizePayoutRequestStatus.REJECTED && (
                <div className="bg-[#FFF4F4] rounded-2xl border border-[#ee1314]/20 p-5 flex flex-col gap-3">
                    <p className="text-[#ee1314] font-bold">Lý do từ chối</p>
                    <p className="text-[14px] text-[#454F5B]">{payout.rejectReason || 'Không rõ'}</p>
                    {resubmitTicket && (
                        <button
                            type="button"
                            onClick={() => setResubmitOpen(true)}
                            className="self-start px-4 py-2 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] cursor-pointer hover:bg-[#d01011] transition-colors"
                        >
                            Gửi yêu cầu mới
                        </button>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            {payout.status === PrizePayoutRequestStatus.PENDING && (
                <button
                    type="button"
                    disabled={cancelMutation.isPending}
                    onClick={handleCancel}
                    className="self-start px-5 py-2.5 border border-[#637381] text-[#637381] font-bold rounded-xl text-[14px] hover:border-[#ee1314] hover:text-[#ee1314] cursor-pointer transition-colors"
                >
                    {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy yêu cầu'}
                </button>
            )}

            {/* Resubmit Modal */}
            {resubmitTicket && (
                <PrizePayoutRequestModal
                    isOpen={resubmitOpen}
                    onClose={() => setResubmitOpen(false)}
                    ticket={resubmitTicket}
                />
            )}

            {/* Image Full-Size Lightbox Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E8EB] bg-[#F9FAFB]">
                            <span className="font-bold text-[14px] text-[#212B36]">{previewImage.title}</span>
                            <button
                                type="button"
                                onClick={() => setPreviewImage(null)}
                                className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#637381] hover:text-[#212B36] transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark text-lg" />
                            </button>
                        </div>
                        <div className="p-4 bg-[#141A21] flex items-center justify-center overflow-auto max-h-[80vh]">
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

