import React from 'react';
import { RefundRequestRole, RefundRequestStatus } from '../../../types/refund.type';

interface RefundStatusStepperProps {
    status: RefundRequestStatus;
    requestRole?: RefundRequestRole;
}

export const RefundStatusStepper: React.FC<RefundStatusStepperProps> = ({
    status,
    requestRole,
}) => {
    if (status === RefundRequestStatus.MANUAL_RESOLUTION) {
        return (
            <div className="bg-[#FFF5F5] rounded-[20px] p-6 lg:p-8 border border-[#FECACA] flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-14 h-14 rounded-full bg-[#C62828] text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    <i className="fa-solid fa-headset"></i>
                </div>
                <div>
                    <h3 className="text-[#C62828] font-bold text-[18px]">Cần xử lý thủ công</h3>
                    <p className="text-[#637381] text-[14px] mt-1.5 font-medium">
                        Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ CSKH.
                    </p>
                </div>
            </div>
        );
    }

    const isStaffIncidentFlow =
        status === RefundRequestStatus.WAITING_FOR_INFO ||
        ((requestRole === RefundRequestRole.STAFF || requestRole === RefundRequestRole.ADMIN) &&
            (status === RefundRequestStatus.READY_TO_PAY ||
                status === RefundRequestStatus.PAID ||
                status === RefundRequestStatus.TRANSFERRED));

    const steps = isStaffIncidentFlow
        ? [
              { key: RefundRequestStatus.WAITING_FOR_INFO, label: 'Chờ STK', icon: 'fa-solid fa-building-columns' },
              { key: RefundRequestStatus.READY_TO_PAY, label: 'Chờ chuyển khoản', icon: 'fa-solid fa-clock' },
              { key: RefundRequestStatus.PAID, label: 'Đã chuyển khoản', icon: 'fa-solid fa-money-bill-transfer' }
          ]
        : [
              { key: RefundRequestStatus.READY_TO_PAY, label: 'Chờ chuyển khoản', icon: 'fa-solid fa-clock' },
              { key: RefundRequestStatus.PAID, label: 'Đã chuyển khoản', icon: 'fa-solid fa-money-bill-transfer' }
          ];

    const getStepIndex = (s: RefundRequestStatus) => {
        if (isStaffIncidentFlow) {
            if (s === RefundRequestStatus.WAITING_FOR_INFO) return 0;
            if (s === RefundRequestStatus.READY_TO_PAY || s === RefundRequestStatus.APPROVED) return 1;
            if (s === RefundRequestStatus.PAID || s === RefundRequestStatus.TRANSFERRED) return 2;
            return 0;
        }
        if (s === RefundRequestStatus.READY_TO_PAY || s === RefundRequestStatus.APPROVED) return 0;
        if (s === RefundRequestStatus.PAID || s === RefundRequestStatus.TRANSFERRED) return 1;
        return 0;
    };

    const currentIndex = getStepIndex(status);

    return (
        <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
            <div className="flex items-center justify-between relative max-w-2xl mx-auto">
                <div className="absolute top-6 left-0 w-full h-[3px] bg-[#F4F6F8] -translate-y-1/2 z-0 rounded-full"></div>
                <div
                    className="absolute top-6 left-0 h-[3px] bg-[#FF3030] -translate-y-1/2 z-0 transition-all duration-700 ease-in-out rounded-full"
                    style={{ width: steps.length > 1 ? `${(currentIndex / (steps.length - 1)) * 100}%` : '100%' }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;

                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center gap-3 bg-white px-2 sm:px-4">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-[16px] transition-all duration-300 ${
                                    isCompleted
                                        ? 'bg-[#FF3030] text-white shadow-[0_0_0_6px_#FFE3D5]'
                                        : 'bg-[#F4F6F8] text-[#919EAB] border-[3px] border-white shadow-sm'
                                } ${isActive ? 'scale-110 shadow-[0_0_0_6px_#FFE3D5]' : ''}`}
                            >
                                <i className={step.icon}></i>
                            </div>
                            <span className={`text-[12px] sm:text-[13px] font-bold text-center ${isCompleted ? 'text-[#212B36]' : 'text-[#919EAB]'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
