package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AiModelRegistryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AiModelRegistryRepository extends JpaRepository<AiModelRegistryEntity, Long> {

    Optional<AiModelRegistryEntity> findByIdAndDeletedAtIsNull(Long id);

    List<AiModelRegistryEntity> findByDeletedAtIsNullOrderByProviderAscModelNameAsc();

    Optional<AiModelRegistryEntity> findByProviderIgnoreCaseAndIsDefaultTrueAndActiveTrueAndDeletedAtIsNull(
            String provider
    );

    Optional<AiModelRegistryEntity> findFirstByIsDefaultTrueAndActiveTrueAndDeletedAtIsNull();
}
