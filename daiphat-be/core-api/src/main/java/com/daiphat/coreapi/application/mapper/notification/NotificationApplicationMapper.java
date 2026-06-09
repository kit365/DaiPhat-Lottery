package com.daiphat.coreapi.application.mapper.notification;

import com.daiphat.coreapi.application.dto.request.notification.CreateNotificationRequest;
import com.daiphat.coreapi.application.dto.response.notification.NotificationResponse;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface NotificationApplicationMapper {

    @Mapping(target = "notificationId", ignore = true)
    @Mapping(target = "read", constant = "false")
    NotificationModel toModel(CreateNotificationRequest request);

    @Mapping(target = "isRead", source = "read")
    NotificationResponse toResponse(NotificationModel model);
}
