package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;

public interface StreetAgentProfileRepositoryPort {
    StreetAgentProfileModel save(StreetAgentProfileModel profile);
    boolean existsByPhone(String phone);
    boolean existsByCccd(String cccd);
}
