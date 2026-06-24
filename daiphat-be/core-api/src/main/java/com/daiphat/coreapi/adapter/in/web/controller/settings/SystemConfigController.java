package com.daiphat.coreapi.adapter.in.web.controller.settings;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.settings.UpdateSystemConfigRequest;
import com.daiphat.coreapi.application.dto.response.settings.SystemConfigResponse;
import com.daiphat.coreapi.application.port.in.settings.SystemConfigServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_ADMIN + "/system-configs")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigServicePort systemConfigServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:view')")
    public ApiResponse<List<SystemConfigResponse>> getAll(
            @RequestParam(required = false) String configType) {
        return ApiResponse.success(null, systemConfigServicePort.getAll(configType));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:edit')")
    public ApiResponse<SystemConfigResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSystemConfigRequest request) {
        return ApiResponse.success("Cập nhật cấu hình thành công.", systemConfigServicePort.update(id, request));
    }
}
