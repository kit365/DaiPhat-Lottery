package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StreetAgentProfileRepository extends JpaRepository<StreetAgentProfileEntity, Long> {
    boolean existsByPhone(String phone);
    boolean existsByCccd(String cccd);

    @Query("""
            SELECT p FROM StreetAgentProfileEntity p
            WHERE p.deletedAt IS NULL
            AND (
                :search IS NULL OR TRIM(:search) = '' OR
                LOWER(CONCAT(p.lastName, ' ', p.firstName)) LIKE LOWER(CONCAT('%', :search, '%')) OR
                p.phone LIKE CONCAT('%', :search, '%') OR
                p.cccd LIKE CONCAT('%', :search, '%')
            )
            AND (:status IS NULL OR p.status = :status)
            """)
    Page<StreetAgentProfileEntity> search(
            @Param("search") String search,
            @Param("status") StreetAgentProfileStatus status,
            Pageable pageable);
}
