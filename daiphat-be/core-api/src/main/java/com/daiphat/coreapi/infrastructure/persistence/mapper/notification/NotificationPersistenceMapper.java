package com.daiphat.coreapi.infrastructure.persistence.mapper.notification;

import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.notification.NotificationEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface NotificationPersistenceMapper {

    @Mapping(target = "id", source = "notificationId")
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "read", source = "read")
    NotificationEntity toEntity(NotificationModel model);

    @Mapping(target = "notificationId", source = "id")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "read", source = "read")
    NotificationModel toDomain(NotificationEntity entity);
}
