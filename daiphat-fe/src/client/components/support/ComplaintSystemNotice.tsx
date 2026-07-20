import React from 'react';
import { format } from 'date-fns';
import { SupportTicketCommentResponse } from '../../../types/support.type';

interface ComplaintSystemNoticeProps {
    comment: SupportTicketCommentResponse;
}

export const ComplaintSystemNotice: React.FC<ComplaintSystemNoticeProps> = ({ comment }) => {
    return (
        <div className="flex gap-4 relative z-10 items-center py-1">
            <div className="w-8 flex justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#C4CDD5] border-2 border-white shadow-sm"></div>
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-[13px] text-[#637381] font-medium italic">
                    {comment.content}
                </span>
                <span className="text-[12px] text-[#919EAB] hidden sm:block">•</span>
                <span className="text-[12px] text-[#919EAB]">
                    {format(new Date(comment.createdAt), 'HH:mm - dd/MM/yyyy')}
                </span>
            </div>
        </div>
    );
};
