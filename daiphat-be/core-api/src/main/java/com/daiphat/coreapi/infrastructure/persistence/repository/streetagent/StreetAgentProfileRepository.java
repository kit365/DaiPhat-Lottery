package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface StreetAgentProfileRepository extends JpaRepository<StreetAgentProfileEntity, Long>,
        JpaSpecificationExecutor<StreetAgentProfileEntity> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from StreetAgentProfileEntity p where p.id = :id and p.deletedAt is null")
    Optional<StreetAgentProfileEntity> findByIdForUpdate(@Param("id") Long id);
    @Query("select p.id from StreetAgentProfileEntity p where p.deletedAt is null")
    List<Long> findAllActiveIds();

    boolean existsByPhoneAndDeletedAtIsNull(String phone);
    boolean existsByCccdAndDeletedAtIsNull(String cccd);
    boolean existsByPhoneAndIdNotAndDeletedAtIsNull(String phone, Long id);
    boolean existsByCccdAndIdNotAndDeletedAtIsNull(String cccd, Long id);
}
