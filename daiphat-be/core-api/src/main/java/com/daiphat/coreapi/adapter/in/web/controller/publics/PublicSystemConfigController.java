package com.daiphat.coreapi.adapter.in.web.controller.publics;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.port.in.settings.SystemConfigServicePort;
import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping(ApiConstants.API_V1_PUBLIC + "/system-configs")
@RequiredArgsConstructor
public class PublicSystemConfigController {

    /** Only non-secret client-facing types — never payment/order/vendor secrets. */
    private static final Set<ConfigType> PUBLIC_CONFIG_TYPES = EnumSet.of(
            ConfigType.GENERAL_SETTING,
            ConfigType.STATIC_PAGE,
            ConfigType.COMPLAINT_SETTING,
            ConfigType.PAYOUT_SETTING
    );

    private final SystemConfigServicePort systemConfigServicePort;

    /** Batch public config lookup — one round-trip for branding keys. */
    @GetMapping("/batch")
    public ApiResponse<Map<String, SystemConfigModel>> getByKeys(@RequestParam("keys") List<String> keys) {
        Map<String, SystemConfigModel> result = new LinkedHashMap<>();
        if (keys == null) {
            return ApiResponse.success(null, result);
        }

        for (String key : keys) {
            if (key == null || key.isBlank()) {
                continue;
            }
            systemConfigServicePort.getConfigByKey(key.trim())
                    .filter(config -> config.getConfigType() != null && PUBLIC_CONFIG_TYPES.contains(config.getConfigType()))
                    .ifPresent(config -> result.put(key.trim(), config));
        }

        return ApiResponse.success(null, result);
    }

    @GetMapping("/{key}")
    public ApiResponse<SystemConfigModel> getByKey(@PathVariable String key) {
        return systemConfigServicePort.getConfigByKey(key)
                .filter(config -> config.getConfigType() != null && PUBLIC_CONFIG_TYPES.contains(config.getConfigType()))
                .map(config -> ApiResponse.success(null, config))
                .orElseGet(() -> ApiResponse.<SystemConfigModel>error("Không tìm thấy cấu hình"));
    }
}
