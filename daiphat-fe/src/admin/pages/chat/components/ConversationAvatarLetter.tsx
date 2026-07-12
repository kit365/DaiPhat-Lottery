import React from 'react';
import { Conversation } from '../../../../types/chat.type';
import { useAccountDetail } from '../../../features/users/hooks/useUsers';

interface Props {
    conversation: Conversation | null | undefined;
}

export const ConversationAvatarLetter: React.FC<Props> = ({ conversation }) => {
    const { data: customer } = useAccountDetail(conversation?.customerId);

    if (!conversation) return <>K</>;
    if (!conversation.assignedOperatorId) return <>Y</>;
    
    const embeddedName = conversation.customerName || conversation.customer?.name || conversation.customer?.fullName;
    if (embeddedName) return <>{embeddedName.charAt(0).toUpperCase()}</>;
    
    if (conversation.title && conversation.title !== 'Yêu cầu hỗ trợ từ khách hàng') {
        return <>{conversation.title.charAt(0).toUpperCase()}</>;
    }
    
    if (customer) {
        const name = customer.fullName || customer.firstName || 'K';
        return <>{name.charAt(0).toUpperCase()}</>;
    }

    return <>K</>;
};
