import React from 'react';
import { format } from 'date-fns';
import { PrizePayoutRequestStatus, formatPrizePayoutCurrency } from '../../../types/prize-payout.type';
import { TransferEvidencePreview } from '@/admin/features/refund/components/TransferEvidencePreview';

interface PrizePayoutStatusStepperProps {
    status: PrizePayoutRequestStatus;
    rejectCount?: number;
    maxOnlineRejectRetry?: number;
    transferEvidenceUrl?: string;
    completedAt?: string;
    requestCode?: string;
    netAmount?: number;
}

export const PrizePayoutStatusStepper: React.FC<PrizePayoutStatusStepperProps> = ({
    status,
    rejectCount,
    maxOnlineRejectRetry,
    transferEvidenceUrl,
    completedAt,
    requestCode,
    netAmount,
}) => {
    if (status === PrizePayoutRequestStatus.MANUAL_RESOLUTION) {
        const maxRetry = maxOnlineRejectRetry ?? 3;
        const attempts = rejectCount ?? maxRetry;
        return (
            <div className="bg-[#FFF5F5] rounded-[20px] p-6 border border-[#FECACA] flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#C62828] text-white flex items-center justify-center text-xl shrink-0">
                    <i className="fa-solid fa-headset"></i>
                </div>
                <div>
                    <h3 className="text-[#C62828] font-bold text-[16px]">Cần xử lý tại đại lý</h3>
                    <p className="text-[#637381] text-[14px] mt-1 leading-relaxed">
                        Yêu cầu trả thưởng trực tuyến đã bị từ chối {attempts}/{maxRetry} lần. Vui lòng mang CCCD và vé đến
                        đại lý đổi thưởng hoặc liên hệ CSKH.
                    </p>
                </div>
            </div>
        );
    }

    if (status === PrizePayoutRequestStatus.REJECTED) {
        return (
            <div className="bg-[#FFF4F4] rounded-[20px] p-6 border border-[#ee1314]/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-xl">
                    <i className="fa-solid fa-circle-xmark"></i>
                </div>
                <div>
                    <h3 className="text-[#ee1314] font-bold text-[16px]">Yêu cầu bị từ chối</h3>
                    <p className="text-[#637381] text-[14px] mt-1">Bạn có thể gửi yêu cầu mới sau khi vé được mở khóa.</p>
                </div>
            </div>
        );
    }

    if (status === PrizePayoutRequestStatus.CANCELLED) {
        return (
            <div className="bg-[#F4F6F8] rounded-[20px] p-6 border border-[#E5E8EB] flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#637381] text-white flex items-center justify-center text-xl">
                    <i className="fa-solid fa-ban"></i>
                </div>
                <div>
                    <h3 className="text-[#212B36] font-bold text-[16px]">Đã hủy yêu cầu</h3>
                    <p className="text-[#637381] text-[14px] mt-1">Vé quay về trạng thái đang giữ hộ.</p>
                </div>
            </div>
        );
    }

    if (status === PrizePayoutRequestStatus.COMPLETED) {
        return (
            <div className="flex items-center gap-2.5 rounded-xl border border-[#A6E9C8] bg-[#E4F8ED] px-3.5 py-2.5">
                <i className="fa-solid fa-circle-check text-[#118D57] text-[15px] shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#118D57] leading-snug">
                        Trả thưởng thành công
                    </p>
                    {completedAt && (
                        <p className="text-[12px] text-[#637381] mt-0.5 leading-snug">
                            {format(new Date(completedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                    )}
                </div>
                {transferEvidenceUrl ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-[#118D57] leading-none">
                            Biên lai
                        </span>
                        <TransferEvidencePreview
                            mini
                            title="Biên lai chuyển khoản"
                            showCaption={false}
                            imageUrl={transferEvidenceUrl}
                            infoItems={[
                                {
                                    label: 'Mã yêu cầu',
                                    value: requestCode || '—',
                                },
                                {
                                    label: 'Thực nhận',
                                    value: formatPrizePayoutCurrency(netAmount ?? 0),
                                },
                                {
                                    label: 'Thời gian',
                                    value: completedAt
                                        ? format(new Date(completedAt), 'dd/MM/yyyy HH:mm')
                                        : '—',
                                },
                            ]}
                        />
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="bg-[#FFF9F3] rounded-[20px] p-6 border border-[#FFE3D5] flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FF3030] text-white flex items-center justify-center text-xl shrink-0">
                <i className="fa-solid fa-clock"></i>
            </div>
            <div>
                <h3 className="text-[#B76E00] font-bold text-[16px]">Đang xử lý</h3>
                <p className="text-[#637381] text-[14px] mt-1">
                    Yêu cầu trả thưởng của bạn đang được xử lý. Vui lòng chờ trong giây lát.
                </p>
            </div>
        </div>
    );
};
