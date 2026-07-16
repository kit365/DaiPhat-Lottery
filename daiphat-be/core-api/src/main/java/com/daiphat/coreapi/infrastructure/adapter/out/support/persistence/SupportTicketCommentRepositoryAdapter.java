package com.daiphat.coreapi.infrastructure.adapter.out.support;

import com.daiphat.coreapi.application.port.out.support.SupportTicketCommentRepositoryPort;
import com.daiphat.coreapi.domain.model.support.SupportTicketCommentModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.support.SupportTicketCommentPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.SupportTicketCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SupportTicketCommentRepositoryAdapter implements SupportTicketCommentRepositoryPort {

    private final SupportTicketCommentRepository supportTicketCommentRepository;
    private final SupportTicketCommentPersistenceMapper supportTicketCommentPersistenceMapper;

    @Override
    public SupportTicketCommentModel save(SupportTicketCommentModel comment) {
        var entity = supportTicketCommentPersistenceMapper.toEntity(comment);
        return supportTicketCommentPersistenceMapper.toDomain(supportTicketCommentRepository.save(entity));
    }

    @Override
    public List<SupportTicketCommentModel> findByTicketIdOrderByCreatedAtAsc(Long ticketId) {
        return supportTicketCommentPersistenceMapper.toDomainList(
                supportTicketCommentRepository.findBySupportTicket_IdOrderByCreatedAtAsc(ticketId));
    }
}
