package com.daiphat.coreapi.infrastructure.persistence.repository.support;

import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SupportTicketRepository extends JpaRepository<SupportTicketEntity, Long>,
        JpaSpecificationExecutor<SupportTicketEntity> {
}
