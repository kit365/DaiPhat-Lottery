package com.daiphat.coreapi.infrastructure.persistence.repository.chat;

import com.daiphat.coreapi.domain.model.enums.chat.AiServiceName;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.AiServiceConfigEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiServiceConfigRepository extends JpaRepository<AiServiceConfigEntity, Long> {

    @EntityGraph(attributePaths = "intentConfigs")
    Optional<AiServiceConfigEntity> findByServiceNameAndActiveTrueAndDeletedAtIsNull(AiServiceName serviceName);
}
