package com.daiphat.coreapi.application.port.in.settings;

import com.daiphat.coreapi.application.dto.request.settings.BulkUpdateVendorConfidencePolicyRequest;
import com.daiphat.coreapi.application.dto.request.settings.UpdateSystemConfigRequest;
import com.daiphat.coreapi.application.dto.response.settings.SystemConfigResponse;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;

import java.util.List;
import java.util.Optional;

public interface SystemConfigServicePort {

    List<SystemConfigResponse> getAll(String configType);

    SystemConfigResponse update(Long id, UpdateSystemConfigRequest request);

    List<SystemConfigResponse> bulkUpdateVendorConfidencePolicy(
            BulkUpdateVendorConfidencePolicyRequest request);

    /**
     * Cached lookup by business key for high-frequency readers.
     */
    Optional<SystemConfigModel> getConfigByKey(String configKey);
}
