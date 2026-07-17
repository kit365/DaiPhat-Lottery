package com.daiphat.coreapi.application.port.out.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupportTicketRepositoryPort {

    Optional<SupportTicketModel> findById(Long id);

    SupportTicketModel save(SupportTicketModel ticket);

    Page<SupportTicketModel> findAll(
            Pageable pageable,
            UUID customerId,
            TicketStatus status,
            String search
    );

    Page<SupportTicketModel> findAllForStaff(
            Pageable pageable,
            List<TicketStatus> statuses,
            UUID assignedTo,
            String search,
            TicketRefType refType,
            Long ticketCategoryId,
            List<String> categoryCodes
    );

    List<SupportTicketModel> findResolvedBefore(LocalDateTime cutoff);
}
