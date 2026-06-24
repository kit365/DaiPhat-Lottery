import React from 'react';
import { format } from 'date-fns';
import { SupportTicketCommentResponse } from '../../../types/support.type';

interface ComplaintSystemNoticeProps {
    comment: SupportTicketCommentResponse;
}

export const ComplaintSystemNotice: React.FC<ComplaintSystemNoticeProps> = ({ comment }) => {
    return (
        <div className="flex flex-col items-center gap-1 py-2">
            <span className="text-[12px] text-[#919EAB] text-center max-w-[90%] leading-relaxed">
                {comment.content}
            </span>
            <span className="text-[11px] text-[#C4CDD5]">
                {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm')}
            </span>
        </div>
    );
};
