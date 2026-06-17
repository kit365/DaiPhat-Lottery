package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;

public interface StreetAgentProfileServicePort {
    StreetAgentProfileResponse create(CreateStreetAgentProfileRequest request);
}
