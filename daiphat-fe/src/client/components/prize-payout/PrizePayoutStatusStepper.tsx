import React from 'react';
import { PrizePayoutRequestStatus } from '../../../types/prize-payout.type';

interface PrizePayoutStatusStepperProps {
    status: PrizePayoutRequestStatus;
    rejectCount?: number;
    maxOnlineRejectRetry?: number;
}

export const PrizePayoutStatusStepper: React.FC<PrizePayoutStatusStepperProps> = ({
    status,
    rejectCount,
    maxOnlineRejectRetry,
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
                        Yêu cầu trả thưởng online đã bị từ chối {attempts}/{maxRetry} lần. Vui lòng mang CCCD và vé đến
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

    const steps = [
        { key: PrizePayoutRequestStatus.PENDING, label: 'Cần xử lý', icon: 'fa-solid fa-clock' },
        { key: PrizePayoutRequestStatus.APPROVED, label: 'Đã duyệt', icon: 'fa-solid fa-user-check' },
        { key: PrizePayoutRequestStatus.COMPLETED, label: 'Đã chuyển khoản', icon: 'fa-solid fa-money-bill-transfer' },
    ];

    const currentIndex =
        status === PrizePayoutRequestStatus.COMPLETED
            ? 2
            : status === PrizePayoutRequestStatus.APPROVED
                ? 1
                : 0;

    return (
        <div className="bg-white rounded-[20px] p-6 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
            <div className="flex items-center justify-between relative max-w-xl mx-auto">
                <div className="absolute top-6 left-0 w-full h-[3px] bg-[#F4F6F8] -translate-y-1/2 z-0 rounded-full"></div>
                <div
                    className="absolute top-6 left-0 h-[3px] bg-[#FF3030] -translate-y-1/2 z-0 transition-all duration-700 rounded-full"
                    style={{ width: `${(currentIndex / Math.max(steps.length - 1, 1)) * 100}%` }}
                ></div>
                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;
                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 bg-white px-3">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    isCompleted ? 'bg-[#FF3030] text-white' : 'bg-[#F4F6F8] text-[#919EAB]'
                                } ${isActive ? 'shadow-[0_0_0_6px_#FFE3D5]' : ''}`}
                            >
                                <i className={step.icon}></i>
                            </div>
                            <span className={`text-[12px] font-bold ${isCompleted ? 'text-[#FF3030]' : 'text-[#919EAB]'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
