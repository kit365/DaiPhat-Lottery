import React from 'react';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import {
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
} from '../../../types/support.type';
import { ChatThreadBubble } from './ChatThreadBubble';
import { Box } from '@mui/material';

interface ComplaintCommentBubbleProps {
    comment: SupportTicketCommentResponse;
    viewerRole?: 'customer' | 'staff';
}

const formatBubbleTime = (iso: string) => {
    const date = new Date(iso);
    const mins = differenceInMinutes(new Date(), date);
    if (mins < 1) return 'vừa xong';
    if (mins < 60) return `${mins} phút`;
    const hours = differenceInHours(new Date(), date);
    if (hours < 24) return `${hours} giờ`;
    return format(date, 'HH:mm');
};

export const ComplaintCommentBubble: React.FC<ComplaintCommentBubbleProps> = ({
    comment,
    viewerRole = 'customer',
}) => {
    const isCustomer = comment.senderRole === TicketCommentSenderRole.CUSTOMER;
    const isMine = viewerRole === 'staff' ? !isCustomer : isCustomer;
    const senderLabel = isCustomer
        ? viewerRole === 'staff'
            ? 'Khách'
            : 'Bạn'
        : viewerRole === 'staff'
          ? 'Bạn'
          : 'Nhân viên';

    return (
        <ChatThreadBubble
            align={isMine ? 'right' : 'left'}
            name={senderLabel}
            time={formatBubbleTime(comment.createdAt)}
            avatarLetter={senderLabel.charAt(0)}
            below={
                comment.attachmentUrl ? (
                    <Box
                        component="a"
                        href={comment.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'block', lineHeight: 0 }}
                    >
                        <Box
                            component="img"
                            src={comment.attachmentUrl}
                            alt="Tệp đính kèm"
                            sx={{
                                display: 'block',
                                maxWidth: 220,
                                maxHeight: 220,
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'cover',
                                borderRadius: '12px',
                                border: '1px solid rgba(145,158,171,0.24)',
                                bgcolor: '#fff',
                            }}
                        />
                    </Box>
                ) : undefined
            }
        >
            {comment.content}
        </ChatThreadBubble>
    );
};
