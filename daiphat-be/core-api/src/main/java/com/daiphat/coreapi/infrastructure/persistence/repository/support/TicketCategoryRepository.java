package com.daiphat.coreapi.infrastructure.persistence.repository.support;

import com.daiphat.coreapi.infrastructure.persistence.entity.support.TicketCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TicketCategoryRepository extends JpaRepository<TicketCategoryEntity, Long> {

    Optional<TicketCategoryEntity> findByCode(String code);
}
