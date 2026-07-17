package com.daiphat.coreapi.adapter.in.web.controller.publics;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.port.in.settings.SystemConfigServicePort;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1_PUBLIC + "/system-configs")
@RequiredArgsConstructor
public class PublicSystemConfigController {

    private final SystemConfigServicePort systemConfigServicePort;

    @GetMapping("/{key}")
    public ApiResponse<SystemConfigModel> getByKey(@PathVariable String key) {
        return systemConfigServicePort.getConfigByKey(key)
                .map(config -> ApiResponse.success(null, config))
                .orElseGet(() -> ApiResponse.error("Không tìm thấy cấu hình", "CONFIG_NOT_FOUND"));
    }
}
