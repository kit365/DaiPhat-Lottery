package com.daiphat.coreapi.application.dto.response.dashboard;

/** Navigation metadata. The backend deliberately does not own frontend URLs. */
public record DashboardActionTarget(String module, String status, String entityId) {
}
