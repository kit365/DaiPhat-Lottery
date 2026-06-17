package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StreetAgentProfileRepositoryPort {
    StreetAgentProfileModel save(StreetAgentProfileModel profile);
    boolean existsByPhone(String phone);
    boolean existsByCccd(String cccd);
    Page<StreetAgentProfileModel> findAll(Pageable pageable, String search, StreetAgentProfileStatus status);
}
