import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { Conversation } from '../../../../types/chat.type';
import { useAccountDetail } from '../../../features/users/hooks/useUsers';

interface Props extends TypographyProps {
    conversation: Conversation | null | undefined;
}

export const ConversationTitle: React.FC<Props> = ({ conversation, ...props }) => {
    const { data: customer } = useAccountDetail(conversation?.customerId);

    if (!conversation) {
        return <Typography {...props}>Khách hàng</Typography>;
    }
    
    if (!conversation.assignedOperatorId) {
        return <Typography {...props}>Yêu cầu hỗ trợ từ khách hàng</Typography>;
    }
    
    const embeddedName = conversation.customerName || conversation.customer?.name || conversation.customer?.fullName;
    if (embeddedName) {
        return <Typography {...props}>{embeddedName}</Typography>;
    }
    
    if (conversation.title && conversation.title !== 'Yêu cầu hỗ trợ từ khách hàng') {
        return <Typography {...props}>{conversation.title}</Typography>;
    }

    if (customer) {
        return <Typography {...props}>{customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || `Khách hàng ${conversation.customerId?.substring(0, 4)}`}</Typography>;
    }

    return (
        <Typography {...props}>
            Khách hàng {conversation.customerId?.substring(0, 4)}
        </Typography>
    );
};
