package com.daiphat.coreapi.infrastructure.adapter.out.support.persistence;

import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.support.SupportTicketPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.SupportTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.SupportTicketSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
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
            String search,
            TicketRefType refType,
            Long ticketCategoryId,
            List<String> categoryCodes) {
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        return supportTicketRepository.findAll(
                        SupportTicketSpecification.filter(
                                null, null, statuses, assignedTo, normalizedSearch,
                                refType, ticketCategoryId, categoryCodes),
                        pageable)
                .map(supportTicketPersistenceMapper::toDomain);
    }

    @Override
    public List<SupportTicketModel> findResolvedBefore(LocalDateTime cutoff) {
        return supportTicketRepository
                .findByStatusAndResolvedAtBefore(TicketStatus.RESOLVED, cutoff)
                .stream()
                .map(supportTicketPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countActiveTickets(UUID customerId) {
        // In-progress always count; REJECTED counts until customer views after rejection.
        return supportTicketRepository.countAttentionTickets(
                customerId,
                List.of(
                        TicketStatus.OPEN,
                        TicketStatus.IN_PROGRESS,
                        TicketStatus.WAITING_FOR_CUSTOMER));
    }

    @Override
    public int markRejectedTicketsViewed(UUID customerId, LocalDateTime viewedAt) {
        return supportTicketRepository.markRejectedTicketsViewed(customerId, viewedAt);
    }
}
