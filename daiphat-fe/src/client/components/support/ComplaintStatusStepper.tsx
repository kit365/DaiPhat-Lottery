import React from 'react';
import { TicketStatus } from '../../../types/support.type';

interface ComplaintStatusStepperProps {
    status: TicketStatus;
}

export const ComplaintStatusStepper: React.FC<ComplaintStatusStepperProps> = ({ status }) => {
    if (status === TicketStatus.CLOSED) {
        return (
            <div className="bg-[#F4F6F8] rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-14 h-14 rounded-full bg-[#919EAB] text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    <i className="fa-solid fa-ban"></i>
                </div>
                <div>
                    <h3 className="text-[#637381] font-bold text-[18px]">Yêu cầu đã đóng</h3>
                    <p className="text-[#637381] text-[14px] mt-1.5 font-medium">
                        Yêu cầu hỗ trợ này đã được đóng.
                    </p>
                </div>
            </div>
        );
    }

    if (status === TicketStatus.REJECTED) {
        return (
            <div className="bg-[#FFF0F0] rounded-[20px] p-6 lg:p-8 border border-[#ee1314]/20 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-14 h-14 rounded-full bg-[#B71D18] text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    <i className="fa-solid fa-circle-xmark"></i>
                </div>
                <div>
                    <h3 className="text-[#B71D18] font-bold text-[18px]">Yêu cầu đã bị từ chối</h3>
                    <p className="text-[#637381] text-[14px] mt-1.5 font-medium">
                        Yêu cầu không hợp lệ hoặc không đủ điều kiện. Vui lòng xem lý do trong phần trao đổi.
                    </p>
                </div>
            </div>
        );
    }

    const steps = [
        { key: TicketStatus.OPEN, label: 'Mới tạo', icon: 'fa-solid fa-file-circle-plus' },
        { key: TicketStatus.IN_PROGRESS, label: 'Đang xử lý', icon: 'fa-solid fa-headset' },
        { key: TicketStatus.RESOLVED, label: 'Đã giải quyết', icon: 'fa-solid fa-circle-check' },
    ];

    const getStepIndex = (s: TicketStatus) => {
        switch (s) {
            case TicketStatus.OPEN:
                return 0;
            case TicketStatus.IN_PROGRESS:
            case TicketStatus.WAITING_FOR_CUSTOMER:
                return 1;
            case TicketStatus.RESOLVED:
                return 2;
            default:
                return 0;
        }
    };

    const currentIndex = getStepIndex(status);

    return (
        <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
            {status === TicketStatus.WAITING_FOR_CUSTOMER && (
                <div className="mb-5 p-4 bg-[#FFF4F4] border border-[#ee1314]/20 rounded-xl flex items-start gap-3">
                    <i className="fa-solid fa-circle-exclamation text-[#ee1314] mt-0.5"></i>
                    <p className="text-[14px] text-[#454F5B] leading-relaxed">
                        Nhân viên đang chờ bạn bổ sung tài liệu hoặc bằng chứng. Vui lòng tải lên hình ảnh minh chứng
                        bên dưới.
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between relative max-w-2xl mx-auto">
                <div className="absolute top-6 left-0 w-full h-[3px] bg-[#F4F6F8] -translate-y-1/2 z-0 rounded-full"></div>
                <div
                    className="absolute top-6 left-0 h-[3px] bg-[#FF3030] -translate-y-1/2 z-0 transition-all duration-700 ease-in-out rounded-full"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;

                    return (
                        <div
                            key={step.key}
                            className="relative z-10 flex flex-col items-center gap-3 bg-white px-2 sm:px-4"
                        >
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-[16px] transition-all duration-300 ${
                                    isCompleted
                                        ? 'bg-[#FF3030] text-white shadow-[0_0_0_6px_#FFE3D5]'
                                        : 'bg-[#F4F6F8] text-[#919EAB] border-[3px] border-white shadow-sm'
                                } ${isActive ? 'scale-110 shadow-[0_0_0_6px_#FFE3D5]' : ''}`}
                            >
                                <i className={step.icon}></i>
                            </div>
                            <span
                                className={`text-[12px] sm:text-[13px] font-bold text-center ${
                                    isCompleted ? 'text-[#212B36]' : 'text-[#919EAB]'
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
