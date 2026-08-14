import React from 'react';
import { format } from 'date-fns';
import { SupportTicketCommentResponse } from '../../../types/support.type';

interface ComplaintSystemNoticeProps {
    comment: SupportTicketCommentResponse;
}

export const ComplaintSystemNotice: React.FC<ComplaintSystemNoticeProps> = ({ comment }) => {
    return (
        <p className="text-[12px] text-[#919EAB] leading-relaxed px-2 py-1 text-center w-full">
            {comment.content}
            <span className="tabular-nums">
                {' · '}
                {format(new Date(comment.createdAt), 'HH:mm')}
            </span>
        </p>
    );
};
