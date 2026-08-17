package com.daiphat.coreapi.infrastructure.adapter.out.chat.persistence;

import com.daiphat.coreapi.application.port.out.chat.ChatPreviousSessionViewPort;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.ChatPreviousSessionViewEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.chat.ChatPreviousSessionViewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ChatPreviousSessionViewAdapter implements ChatPreviousSessionViewPort {

    private final ChatPreviousSessionViewRepository chatPreviousSessionViewRepository;

    @Override
    public void record(
            UUID viewerId,
            Long currentConversationId,
            Long previousConversationId,
            LocalDateTime viewedAt
    ) {
        chatPreviousSessionViewRepository.save(ChatPreviousSessionViewEntity.builder()
                .viewerId(viewerId)
                .currentConversationId(currentConversationId)
                .previousConversationId(previousConversationId)
                .viewedAt(viewedAt != null ? viewedAt : LocalDateTime.now())
                .build());
    }
}
