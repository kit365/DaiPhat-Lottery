package com.daiphat.coreapi.infrastructure.persistence.repository.chat;

import com.daiphat.coreapi.infrastructure.persistence.entity.chat.ChatPreviousSessionViewEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatPreviousSessionViewRepository extends JpaRepository<ChatPreviousSessionViewEntity, Long> {
}
