package com.daiphat.coreapi.application.mapper.notification;

import com.daiphat.coreapi.application.dto.request.notification.UpsertNotificationSettingRequest;
import com.daiphat.coreapi.application.dto.response.notification.NotificationSettingResponse;
import com.daiphat.coreapi.domain.model.notifications.NotificationSettingModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface NotificationSettingApplicationMapper {

    @Mapping(target = "notificationSettingId", ignore = true)
    @Mapping(target = "enabled", source = "isEnabled")
    NotificationSettingModel toModel(UpsertNotificationSettingRequest request);

    @Mapping(target = "isEnabled", source = "enabled")
    NotificationSettingResponse toResponse(NotificationSettingModel model);
}
