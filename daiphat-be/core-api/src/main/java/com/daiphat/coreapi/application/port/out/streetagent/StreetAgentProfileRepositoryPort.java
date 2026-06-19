package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface StreetAgentProfileRepositoryPort {
    Optional<StreetAgentProfileModel> findById(Long id);
    StreetAgentProfileModel save(StreetAgentProfileModel profile);
    boolean existsByPhone(String phone);
    boolean existsByCccd(String cccd);
    boolean existsByPhoneAndIdNot(String phone, Long id);
    boolean existsByCccdAndIdNot(String cccd, Long id);
    Page<StreetAgentProfileModel> findAll(Pageable pageable, String search, StreetAgentProfileStatus status);
    long countAll(String search);
    long countByStatus(StreetAgentProfileStatus status, String search);
}
