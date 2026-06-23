import React from 'react';
import { format } from 'date-fns';
import {
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
} from '../../../types/support.type';

interface ComplaintCommentBubbleProps {
    comment: SupportTicketCommentResponse;
}

export const ComplaintCommentBubble: React.FC<ComplaintCommentBubbleProps> = ({ comment }) => {
    const isCustomer = comment.senderRole === TicketCommentSenderRole.CUSTOMER;

    return (
        <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[85%] sm:max-w-[75%] flex flex-col gap-2 ${
                    isCustomer ? 'items-end' : 'items-start'
                }`}
            >
                <span className="text-[12px] font-bold text-[#637381] px-1">
                    {isCustomer ? 'Bạn' : 'Nhân viên hỗ trợ'}
                </span>
                <div
                    className={`rounded-2xl px-4 py-3 border ${
                        isCustomer
                            ? 'bg-[#FFF4F4] border-[#ee1314]/20 rounded-br-md'
                            : 'bg-[#F0F5FF] border-[#2065D1]/20 rounded-bl-md'
                    }`}
                >
                    <p className="text-[14px] text-[#212B36] leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                    </p>
                    {comment.attachmentUrl && (
                        <a
                            href={comment.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-3 rounded-lg border border-[#E5E8EB] overflow-hidden hover:border-[#ee1314]/30 transition-colors"
                        >
                            <img
                                src={comment.attachmentUrl}
                                alt="Hình đính kèm"
                                className="w-full max-h-[200px] object-contain bg-[#F9FAFB]"
                            />
                        </a>
                    )}
                </div>
                <span className="text-[11px] text-[#919EAB] px-1">
                    {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm')}
                </span>
            </div>
        </div>
    );
};
