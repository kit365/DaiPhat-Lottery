package com.daiphat.coreapi.infrastructure.adapter.out.support;

import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.support.SupportTicketPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.SupportTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.SupportTicketSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SupportTicketRepositoryAdapter implements SupportTicketRepositoryPort {

    private final SupportTicketRepository supportTicketRepository;
    private final SupportTicketPersistenceMapper supportTicketPersistenceMapper;

    @Override
    public Optional<SupportTicketModel> findById(Long id) {
        return supportTicketRepository.findById(id)
                .map(supportTicketPersistenceMapper::toDomain);
    }

    @Override
    public SupportTicketModel save(SupportTicketModel ticket) {
        var entity = supportTicketPersistenceMapper.toEntity(ticket);
        return supportTicketPersistenceMapper.toDomain(supportTicketRepository.save(entity));
    }

    @Override
    public Page<SupportTicketModel> findAll(
            Pageable pageable,
            UUID customerId,
            TicketStatus status,
            String search) {
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        return supportTicketRepository.findAll(
                        SupportTicketSpecification.filter(customerId, status, normalizedSearch),
                        pageable)
                .map(supportTicketPersistenceMapper::toDomain);
    }

    @Override
    public Page<SupportTicketModel> findAllForStaff(
            Pageable pageable,
            List<TicketStatus> statuses,
            UUID assignedTo,
            String search) {
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        return supportTicketRepository.findAll(
                        SupportTicketSpecification.filter(null, null, statuses, assignedTo, normalizedSearch),
                        pageable)
                .map(supportTicketPersistenceMapper::toDomain);
    }
}
