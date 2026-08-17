package com.daiphat.coreapi.application.port.out.chat;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ChatPreviousSessionViewPort {

    void record(UUID viewerId, Long currentConversationId, Long previousConversationId, LocalDateTime viewedAt);
}
