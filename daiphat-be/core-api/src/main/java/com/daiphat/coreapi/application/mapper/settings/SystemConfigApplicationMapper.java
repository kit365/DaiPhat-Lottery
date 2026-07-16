package com.daiphat.coreapi.application.mapper.settings;

import com.daiphat.coreapi.application.dto.request.settings.UpdateSystemConfigRequest;
import com.daiphat.coreapi.application.dto.response.settings.SystemConfigResponse;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.shared.util.SystemConfigValueValidator;
import org.springframework.stereotype.Component;

@Component
public class SystemConfigApplicationMapper {

    public SystemConfigResponse toResponse(SystemConfigModel model) {
        if (model == null) {
            return null;
        }
        return SystemConfigResponse.builder()
                .id(model.getId())
                .configKey(model.getConfigKey())
                .configValue(model.getConfigValue())
                .configType(model.getConfigType() != null ? model.getConfigType().name() : null)
                .dataType(model.getDataType() != null ? model.getDataType().name() : null)
                .description(model.getDescription())
                .updatedAt(model.getUpdatedAt())
                .updatedBy(model.getLastModifiedBy())
                .build();
    }

    public void merge(UpdateSystemConfigRequest request, SystemConfigModel model) {
        Object parsed = SystemConfigValueValidator.parse(request.configValue(), model.getDataType());
        if (parsed instanceof String normalized) {
            model.setConfigValue(normalized);
        } else if (parsed instanceof Boolean bool) {
            model.setConfigValue(bool.toString());
        } else if (parsed instanceof Integer number) {
            model.setConfigValue(String.valueOf(number));
        } else {
            model.setConfigValue(request.configValue().trim());
        }
        model.setDescription(request.description().trim());
    }
}
