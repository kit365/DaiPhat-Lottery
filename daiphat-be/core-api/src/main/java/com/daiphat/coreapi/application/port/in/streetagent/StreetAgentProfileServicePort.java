package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;

public interface StreetAgentProfileServicePort {
    PageResponse<StreetAgentProfileResponse> getAll(int page, int limit, String search, String status);
    StreetAgentProfileResponse getById(Long id);
    StreetAgentProfileResponse create(CreateStreetAgentProfileRequest request);
    StreetAgentProfileResponse update(Long id, UpdateStreetAgentProfileRequest request);
    void delete(Long id);
}
