package com.daiphat.coreapi.infrastructure.persistence.repository.support;

import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketCommentRepository extends JpaRepository<SupportTicketCommentEntity, Long> {

    List<SupportTicketCommentEntity> findBySupportTicket_IdOrderByCreatedAtAsc(Long supportTicketId);
}
