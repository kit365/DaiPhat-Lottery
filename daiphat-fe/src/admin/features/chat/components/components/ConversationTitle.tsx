import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { Conversation } from '../../../../../types/chat.type';
import { useAccountDetail } from '../../../users/hooks/useUsers';

interface Props extends TypographyProps {
    conversation: Conversation | null | undefined;
}

export const ConversationTitle: React.FC<Props> = ({ conversation, sx, noWrap, ...props }) => {
    const { data: customer } = useAccountDetail(conversation?.customerId);
    const titleSx = {
        ...(noWrap
            ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }
            : {}),
        ...((sx as object) || {}),
    };

    const text = (() => {
        if (!conversation) return 'Khách hàng';
        if (!conversation.assignedOperatorId) return 'Yêu cầu hỗ trợ từ khách hàng';
        const embeddedName = conversation.customerName || conversation.customer?.name || conversation.customer?.fullName;
        if (embeddedName) return embeddedName;
        if (conversation.title && conversation.title !== 'Yêu cầu hỗ trợ từ khách hàng') return conversation.title;
        if (customer) {
            return customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || `Khách hàng ${conversation.customerId?.substring(0, 4)}`;
        }
        return `Khách hàng ${conversation.customerId?.substring(0, 4)}`;
    })();

    return (
        <Typography noWrap={noWrap} sx={titleSx} {...props}>
            {text}
        </Typography>
    );
};
