package com.daiphat.coreapi.application.dto.request.settings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.Map;

/**
 * Bulk replace for all vendor confidence policy keys in one transaction.
 * Keys must be {@code VENDOR_CONFIDENCE_*}; values are raw config strings.
 */
public record BulkUpdateVendorConfidencePolicyRequest(
        @NotEmpty(message = "Danh sách cấu hình confidence không được rỗng")
        Map<@NotBlank String, @NotBlank String> values
) {
}
