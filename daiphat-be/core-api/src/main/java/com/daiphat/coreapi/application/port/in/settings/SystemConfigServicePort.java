package com.daiphat.coreapi.application.port.in.settings;

import com.daiphat.coreapi.application.dto.request.settings.UpdateSystemConfigRequest;
import com.daiphat.coreapi.application.dto.response.settings.SystemConfigResponse;

import java.util.List;

public interface SystemConfigServicePort {

    List<SystemConfigResponse> getAll(String configType);

    SystemConfigResponse update(Long id, UpdateSystemConfigRequest request);
}
