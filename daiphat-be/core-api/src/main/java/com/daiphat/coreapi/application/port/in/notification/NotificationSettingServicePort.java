package com.daiphat.coreapi.application.port.in.notification;

import com.daiphat.coreapi.application.dto.request.notification.UpdateMyNotificationSettingRequest;
import com.daiphat.coreapi.application.dto.response.notification.NotificationSettingResponse;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;

import java.util.List;
import java.util.UUID;

public interface NotificationSettingServicePort {

    List<NotificationSettingResponse> getMySettings(UUID userId);

    NotificationSettingResponse upsertMySetting(UUID userId, UpdateMyNotificationSettingRequest request);

    boolean isEnabled(UUID userId, NotificationChannel channel, NotificationType type);
}
