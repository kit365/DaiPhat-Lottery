package com.daiphat.coreapi.application.dto.response.notification;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;

public record NotificationReferenceAvailabilityResponse(
        boolean available,
        NotificationReferenceType referenceType,
        String referenceId,
        String message
) {
    public static final String UNAVAILABLE_MESSAGE =
            "Nội dung tham chiếu không còn khả dụng hoặc đã bị xóa. Thông báo này không còn hiệu lực.";

    public static NotificationReferenceAvailabilityResponse available(
            NotificationReferenceType referenceType,
            String referenceId
    ) {
        return new NotificationReferenceAvailabilityResponse(true, referenceType, referenceId, null);
    }

    public static NotificationReferenceAvailabilityResponse unavailable(
            NotificationReferenceType referenceType,
            String referenceId
    ) {
        return new NotificationReferenceAvailabilityResponse(
                false,
                referenceType,
                referenceId,
                UNAVAILABLE_MESSAGE
        );
    }
}
