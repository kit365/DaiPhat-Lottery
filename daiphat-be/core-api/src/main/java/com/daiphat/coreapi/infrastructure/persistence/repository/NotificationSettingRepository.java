package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.infrastructure.persistence.entity.notification.NotificationSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationSettingRepository extends JpaRepository<NotificationSettingEntity, Long> {

    List<NotificationSettingEntity> findByUser_IdOrderByTypeAscChannelAsc(UUID userId);

    Optional<NotificationSettingEntity> findByUser_IdAndChannelAndType(
            UUID userId,
            NotificationChannel channel,
            NotificationType type
    );
}
