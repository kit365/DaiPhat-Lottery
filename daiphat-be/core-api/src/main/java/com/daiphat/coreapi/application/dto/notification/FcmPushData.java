package com.daiphat.coreapi.application.dto.notification;

import lombok.Builder;

import java.util.HashMap;
import java.util.Map;

@Builder
public record FcmPushData(
        Long notificationId,
        String type,
        String referenceId,
        String referenceType
) {
    public Map<String, String> toMap() {
        Map<String, String> data = new HashMap<>();
        if (notificationId != null) data.put("notificationId", String.valueOf(notificationId));
        if (type != null) data.put("type", type);
        if (referenceId != null) data.put("referenceId", referenceId);
        if (referenceType != null) data.put("referenceType", referenceType);
        return data;
    }
}
