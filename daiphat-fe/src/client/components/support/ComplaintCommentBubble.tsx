import React from 'react';
import { format } from 'date-fns';
import {
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
} from '../../../types/support.type';

interface ComplaintCommentBubbleProps {
    comment: SupportTicketCommentResponse;
    viewerRole?: 'customer' | 'staff';
}

export const ComplaintCommentBubble: React.FC<ComplaintCommentBubbleProps> = ({
    comment,
    viewerRole = 'customer',
}) => {
    const isCustomer = comment.senderRole === TicketCommentSenderRole.CUSTOMER;

    const senderLabel = isCustomer
        ? viewerRole === 'staff'
            ? 'Khách hàng'
            : 'Bạn'
        : viewerRole === 'staff'
          ? 'Bạn (nhân viên)'
          : 'Nhân viên hỗ trợ';

    return (
        <div className="flex gap-4 relative z-10 group">
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] border-[3px] border-white shadow-sm mt-0.5 ${
                isCustomer ? 'bg-[#FFF4F4] text-[#ee1314]' : 'bg-[#F0F5FF] text-[#2065D1]'
            }`}>
                <i className={`fa-solid ${isCustomer ? 'fa-user' : 'fa-headset'}`}></i>
            </div>
            
            <div className={`flex-1 flex flex-col rounded-xl overflow-hidden border transition-shadow hover:shadow-sm ${
                isCustomer ? 'border-[#E5E8EB] bg-white' : 'border-[#2065D1]/20 bg-white'
            }`}>
                <div className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b ${
                    isCustomer ? 'border-[#E5E8EB] bg-[#F9FAFB]' : 'border-[#2065D1]/10 bg-[#F0F5FF]/40'
                }`}>
                    <span className="text-[13px] font-bold text-[#212B36]">
                        {senderLabel}
                    </span>
                    <span className="text-[12px] text-[#919EAB] font-medium">
                        {format(new Date(comment.createdAt), 'HH:mm - dd/MM/yyyy')}
                    </span>
                </div>
                
                <div className="px-4 py-3">
                    <p className="text-[14px] text-[#212B36] leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                    </p>
                    {comment.attachmentUrl && (
                        <a
                            href={comment.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-3 rounded-lg overflow-hidden border border-[#E5E8EB] hover:border-[#ee1314]/30 transition-colors bg-[#F9FAFB]"
                        >
                            <img
                                src={comment.attachmentUrl}
                                alt="Hình đính kèm"
                                className="w-full max-h-[280px] object-contain"
                            />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
