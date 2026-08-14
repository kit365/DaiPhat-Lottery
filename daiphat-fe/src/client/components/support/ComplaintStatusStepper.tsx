import React from 'react';
import { TicketStatus } from '../../../types/support.type';

interface ComplaintStatusStepperProps {
    status: TicketStatus;
}

const STEPS = [
    { key: TicketStatus.OPEN, label: 'Mới tạo' },
    { key: TicketStatus.IN_PROGRESS, label: 'Đang xử lý' },
    { key: TicketStatus.RESOLVED, label: 'Đã giải quyết' },
] as const;

export const ComplaintStatusStepper: React.FC<ComplaintStatusStepperProps> = ({ status }) => {
    if (status === TicketStatus.CLOSED) {
        return (
            <p className="text-[13px] text-[#637381]">
                Yêu cầu này đã đóng.
            </p>
        );
    }

    if (status === TicketStatus.REJECTED) {
        return (
            <p className="text-[13px] text-[#B71D18]">
                Yêu cầu đã bị từ chối. Lý do nằm trong phần trao đổi.
            </p>
        );
    }

    const currentIndex =
        status === TicketStatus.RESOLVED
            ? 2
            : status === TicketStatus.IN_PROGRESS || status === TicketStatus.WAITING_FOR_CUSTOMER
              ? 1
              : 0;

    return (
        <div className="flex flex-col gap-3">
            {status === TicketStatus.WAITING_FOR_CUSTOMER && (
                <p className="text-[13px] text-[#B76E00] bg-[#FFF9F3] border border-[#FFB020]/25 rounded-xl px-3.5 py-2.5">
                    Nhân viên đang chờ bạn bổ sung tài liệu. Vui lòng gửi thêm trong phần trao đổi.
                </p>
            )}
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                {STEPS.map((step, index) => {
                    const reached = index <= currentIndex;
                    return (
                        <li key={step.key} className="flex items-center gap-2">
                            {index > 0 && (
                                <span className="text-[#C4CDD5] select-none" aria-hidden>
                                    /
                                </span>
                            )}
                            <span
                                className={
                                    reached
                                        ? index === currentIndex
                                            ? 'font-semibold text-[#ee1314]'
                                            : 'font-medium text-[#212B36]'
                                        : 'text-[#919EAB]'
                                }
                            >
                                {step.label}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};
