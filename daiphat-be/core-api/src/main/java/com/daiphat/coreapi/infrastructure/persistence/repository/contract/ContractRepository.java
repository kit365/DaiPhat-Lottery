package com.daiphat.coreapi.infrastructure.persistence.repository.contract;

import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.infrastructure.persistence.entity.contract.ContractEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<ContractEntity, Long> {

    Optional<ContractEntity> findByIdAndDeletedAtIsNull(Long id);

    Optional<ContractEntity> findByCodeAndDeletedAtIsNull(String code);

    Optional<ContractEntity> findFirstByTypeAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(ContractType type);

    Optional<ContractEntity> findFirstByTypeAndIsDefaultTrueAndDeletedAtIsNull(ContractType type);

    List<ContractEntity> findAllByActiveTrueAndDeletedAtIsNullOrderByIdAsc();

    List<ContractEntity> findAllByDeletedAtIsNullOrderByIdAsc();

    List<ContractEntity> findAllByTypeAndDeletedAtIsNullOrderByIsDefaultDescIdAsc(ContractType type);

    List<ContractEntity> findAllByCodeStartingWithAndDeletedAtIsNull(String prefix);

    long countByTypeAndDeletedAtIsNull(ContractType type);

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE ContractEntity c
            SET c.isDefault = FALSE
            WHERE c.type = :type
              AND c.deletedAt IS NULL
              AND (:excludeId IS NULL OR c.id <> :excludeId)
              AND c.isDefault = TRUE
            """)
    int clearDefaultForType(@Param("type") ContractType type, @Param("excludeId") Long excludeId);
}
