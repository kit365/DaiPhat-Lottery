package com.daiphat.coreapi.application.port.out.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
}
