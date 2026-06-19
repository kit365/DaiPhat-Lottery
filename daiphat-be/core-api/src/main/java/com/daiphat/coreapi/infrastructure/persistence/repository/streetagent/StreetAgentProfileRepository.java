package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface StreetAgentProfileRepository extends JpaRepository<StreetAgentProfileEntity, Long>,
        JpaSpecificationExecutor<StreetAgentProfileEntity> {
    boolean existsByPhoneAndDeletedAtIsNull(String phone);
    boolean existsByCccdAndDeletedAtIsNull(String cccd);
    boolean existsByPhoneAndIdNotAndDeletedAtIsNull(String phone, Long id);
    boolean existsByCccdAndIdNotAndDeletedAtIsNull(String cccd, Long id);
}
