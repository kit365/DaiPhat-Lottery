package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/street-agent-profiles")
@RequiredArgsConstructor
public class StreetAgentProfileController {

    private final StreetAgentProfileServicePort streetAgentProfileServicePort;

    @PostMapping
    @PreAuthorize("hasAuthority('member:create')")
    public ApiResponse<StreetAgentProfileResponse> create(
            @Valid @RequestBody CreateStreetAgentProfileRequest request) {
        StreetAgentProfileResponse response = streetAgentProfileServicePort.create(request);
        return ApiResponse.success("Tạo hồ sơ đại lý bán dạo thành công.", response);
    }
}
