package com.daiphat.coreapi.infrastructure.adapter.out.notification.persistence;

import com.daiphat.coreapi.application.port.out.notification.NotificationSettingRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationSettingModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.notification.NotificationSettingPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.NotificationSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationSettingRepositoryAdapter implements NotificationSettingRepositoryPort {

    private final NotificationSettingRepository notificationSettingRepository;
    private final NotificationSettingPersistenceMapper notificationSettingPersistenceMapper;

    @Override
    public List<NotificationSettingModel> findByUserId(UUID userId) {
        return notificationSettingRepository.findByUser_IdOrderByTypeAscChannelAsc(userId).stream()
                .map(notificationSettingPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<NotificationSettingModel> findByUserIdAndChannelAndType(
            UUID userId,
            NotificationChannel channel,
            NotificationType type
    ) {
        return notificationSettingRepository.findByUser_IdAndChannelAndType(userId, channel, type)
                .map(notificationSettingPersistenceMapper::toDomain);
    }

    @Override
    public NotificationSettingModel save(NotificationSettingModel setting) {
        var entity = notificationSettingPersistenceMapper.toEntity(setting);
        return notificationSettingPersistenceMapper.toDomain(notificationSettingRepository.save(entity));
    }
}
