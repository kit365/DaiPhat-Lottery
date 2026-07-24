package com.daiphat.coreapi.application.port.out.notification;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationSettingModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationSettingRepositoryPort {

    List<NotificationSettingModel> findByUserId(UUID userId);

    Optional<NotificationSettingModel> findByUserIdAndChannelAndType(
            UUID userId,
            NotificationChannel channel,
            NotificationType type
    );

    NotificationSettingModel save(NotificationSettingModel setting);
}
