package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AgencyFundEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgencyFundRepository extends JpaRepository<AgencyFundEntity, Long> {

    Optional<AgencyFundEntity> findByAgencyId(UUID agencyId);

    /**
     * Pessimistic lock — SELECT FOR UPDATE.
     * Dùng khi cần debit credit để tránh double-spend.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM AgencyFundEntity f WHERE f.agencyId = :agencyId")
    Optional<AgencyFundEntity> findByAgencyIdWithLock(@Param("agencyId") UUID agencyId);

    boolean existsByAgencyId(UUID agencyId);
}
