package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/street-agent-profiles")
@RequiredArgsConstructor
public class StreetAgentProfileController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final StreetAgentProfileServicePort streetAgentProfileServicePort;

    @GetMapping
    @PreAuthorize("hasAuthority('member:view')")
    public ApiResponse<PageResponse<StreetAgentProfileResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return ApiResponse.success(
                null,
                streetAgentProfileServicePort.getAll(page, limit, search, status));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('member:view')")
    public ApiResponse<StreetAgentProfileResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, streetAgentProfileServicePort.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('member:create')")
    public ApiResponse<StreetAgentProfileResponse> create(
            @Valid @RequestBody CreateStreetAgentProfileRequest request) {
        StreetAgentProfileResponse response = streetAgentProfileServicePort.create(request);
        return ApiResponse.success("Tạo hồ sơ đại lý bán dạo thành công.", response);
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAuthority('member:edit')")
    public ApiResponse<StreetAgentProfileResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStreetAgentProfileRequest request) {
        StreetAgentProfileResponse response = streetAgentProfileServicePort.update(id, request);
        return ApiResponse.success("Cập nhật hồ sơ đại lý bán dạo thành công.", response);
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAuthority('member:delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        streetAgentProfileServicePort.delete(id);
        return ApiResponse.success("Xóa hồ sơ đại lý bán dạo thành công.", null);
    }
}
