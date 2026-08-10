package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateApprovedDailyCapRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import java.util.UUID;

public interface StreetAgentProfileServicePort {
    PageResponse<StreetAgentProfileResponse> getAll(
            int page, int limit, String search, String status, String contactProvince);
    StreetAgentProfileResponse getById(Long id);
    StreetAgentProfileResponse create(CreateStreetAgentProfileRequest request);
    StreetAgentProfileResponse update(Long id, UpdateStreetAgentProfileRequest request);
    StreetAgentProfileResponse updateApprovedDailyCap(Long id, UpdateApprovedDailyCapRequest request, UUID operatorId);
    void delete(Long id);
    StreetAgentProfileResponse uploadSignedContractDocument(Long id, UploadRequest request);
}
