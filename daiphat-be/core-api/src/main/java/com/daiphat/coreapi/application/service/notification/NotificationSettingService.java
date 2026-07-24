package com.daiphat.coreapi.application.service.notification;

import com.daiphat.coreapi.application.dto.request.notification.UpdateMyNotificationSettingRequest;
import com.daiphat.coreapi.application.dto.response.notification.NotificationSettingResponse;
import com.daiphat.coreapi.application.mapper.notification.NotificationSettingApplicationMapper;
import com.daiphat.coreapi.application.port.in.notification.NotificationSettingServicePort;
import com.daiphat.coreapi.application.port.out.notification.NotificationSettingRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationSettingModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationSettingService implements NotificationSettingServicePort {

    private static final List<ManagedSettingKey> DEFAULT_MANAGED_SETTINGS = List.of(
            new ManagedSettingKey(NotificationChannel.IN_APP, NotificationType.RESULT),
            new ManagedSettingKey(NotificationChannel.IN_APP, NotificationType.DRAW_RESULT)
    );

    private final NotificationSettingRepositoryPort notificationSettingRepositoryPort;
    private final NotificationSettingApplicationMapper notificationSettingApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationSettingResponse> getMySettings(UUID userId) {
        List<NotificationSettingModel> stored = notificationSettingRepositoryPort.findByUserId(userId);
        List<NotificationSettingResponse> responses = new ArrayList<>();

        for (ManagedSettingKey key : DEFAULT_MANAGED_SETTINGS) {
            Optional<NotificationSettingModel> existing = stored.stream()
                    .filter(s -> s.getChannel() == key.channel() && s.getType() == key.type())
                    .findFirst();

            if (existing.isPresent()) {
                responses.add(notificationSettingApplicationMapper.toResponse(existing.get()));
            } else {
                responses.add(NotificationSettingResponse.builder()
                        .notificationSettingId(null)
                        .userId(userId)
                        .channel(key.channel())
                        .type(key.type())
                        .isEnabled(true)
                        .updatedAt(null)
                        .build());
            }
        }
        return responses;
    }

    @Override
    @Transactional
    public NotificationSettingResponse upsertMySetting(UUID userId, UpdateMyNotificationSettingRequest request) {
        NotificationSettingModel setting = notificationSettingRepositoryPort
                .findByUserIdAndChannelAndType(userId, request.channel(), request.type())
                .orElseGet(() -> NotificationSettingModel.builder()
                        .userId(userId)
                        .channel(request.channel())
                        .type(request.type())
                        .enabled(true)
                        .build());

        setting.toggle(Boolean.TRUE.equals(request.isEnabled()));
        return notificationSettingApplicationMapper.toResponse(notificationSettingRepositoryPort.save(setting));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isEnabled(UUID userId, NotificationChannel channel, NotificationType type) {
        if (userId == null || channel == null || type == null) {
            return true;
        }
        return notificationSettingRepositoryPort.findByUserIdAndChannelAndType(userId, channel, type)
                .map(NotificationSettingModel::isEnabled)
                .orElse(true);
    }

    private record ManagedSettingKey(NotificationChannel channel, NotificationType type) {
    }
}
