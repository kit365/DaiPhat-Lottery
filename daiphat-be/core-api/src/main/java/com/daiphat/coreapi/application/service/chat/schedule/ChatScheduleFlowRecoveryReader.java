package com.daiphat.coreapi.application.service.chat.schedule;

import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatScheduleFlowRecoveryReader {

    private static final int BOT_MESSAGE_LOOKBACK = 8;

    private final MessageRepositoryPort messageRepositoryPort;

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public List<MessageModel> fetchRecentBotTokens(Long conversationId) {
        if (conversationId == null) {
            return List.of();
        }
        return messageRepositoryPort.findRecentBotMessagesByConversationId(
                conversationId,
                MessageSenderType.AI_SYSTEM,
                BOT_MESSAGE_LOOKBACK
        );
    }
}
