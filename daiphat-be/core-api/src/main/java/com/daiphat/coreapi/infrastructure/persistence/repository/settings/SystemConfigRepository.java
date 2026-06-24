package com.daiphat.coreapi.infrastructure.persistence.repository.settings;

import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.infrastructure.persistence.entity.settings.SystemConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SystemConfigRepository extends JpaRepository<SystemConfigEntity, Long> {

    List<SystemConfigEntity> findAllByIsActiveTrueOrderByConfigTypeAscConfigKeyAsc();

    List<SystemConfigEntity> findByConfigTypeAndIsActiveTrueOrderByConfigKeyAsc(ConfigType configType);

    Optional<SystemConfigEntity> findByIdAndIsActiveTrue(Long id);
}
