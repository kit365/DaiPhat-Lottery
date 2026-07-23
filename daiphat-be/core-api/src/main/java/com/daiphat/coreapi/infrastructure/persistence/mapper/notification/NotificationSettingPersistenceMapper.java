package com.daiphat.coreapi.infrastructure.persistence.mapper.notification;

import com.daiphat.coreapi.domain.model.notifications.NotificationSettingModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.notification.NotificationSettingEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface NotificationSettingPersistenceMapper {

    @Mapping(target = "notificationSettingId", source = "id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "enabled", source = "enabled")
    NotificationSettingModel toDomain(NotificationSettingEntity entity);

    @Mapping(target = "id", source = "notificationSettingId")
    @Mapping(target = "user", source = "userId")
    @Mapping(target = "enabled", source = "enabled")
    NotificationSettingEntity toEntity(NotificationSettingModel model);

    default UserEntity mapUserId(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }
}
