package com.daiphat.coreapi.application.service.notification;

import com.daiphat.coreapi.application.dto.request.notification.UpdateMyNotificationSettingRequest;
import com.daiphat.coreapi.application.dto.response.notification.NotificationSettingResponse;
import com.daiphat.coreapi.application.mapper.notification.NotificationSettingApplicationMapper;
import com.daiphat.coreapi.application.port.out.notification.NotificationSettingRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationSettingModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationSettingServiceTest {

    @Mock
    private NotificationSettingRepositoryPort notificationSettingRepositoryPort;

    @Mock
    private NotificationSettingApplicationMapper notificationSettingApplicationMapper;

    private NotificationSettingService service;

    private final UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @BeforeEach
    void setUp() {
        service = new NotificationSettingService(
                notificationSettingRepositoryPort,
                notificationSettingApplicationMapper
        );
    }

    @Test
    @DisplayName("getMySettings returns default RESULT and DRAW_RESULT enabled when no row exists")
    void getMySettings_defaultsEnabled() {
        when(notificationSettingRepositoryPort.findByUserId(userId)).thenReturn(List.of());

        List<NotificationSettingResponse> responses = service.getMySettings(userId);

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).type()).isEqualTo(NotificationType.RESULT);
        assertThat(responses.get(0).channel()).isEqualTo(NotificationChannel.IN_APP);
        assertThat(responses.get(0).isEnabled()).isTrue();
        assertThat(responses.get(1).type()).isEqualTo(NotificationType.DRAW_RESULT);
        assertThat(responses.get(1).channel()).isEqualTo(NotificationChannel.IN_APP);
        assertThat(responses.get(1).isEnabled()).isTrue();
    }

    @Test
    @DisplayName("isEnabled returns false when user disabled RESULT")
    void isEnabled_respectsStoredSetting() {
        when(notificationSettingRepositoryPort.findByUserIdAndChannelAndType(
                userId, NotificationChannel.IN_APP, NotificationType.RESULT
        )).thenReturn(Optional.of(NotificationSettingModel.builder()
                .userId(userId)
                .channel(NotificationChannel.IN_APP)
                .type(NotificationType.RESULT)
                .enabled(false)
                .build()));

        assertThat(service.isEnabled(userId, NotificationChannel.IN_APP, NotificationType.RESULT))
                .isFalse();
    }

    @Test
    @DisplayName("upsertMySetting creates and disables RESULT preference")
    void upsertMySetting_disablesResult() {
        when(notificationSettingRepositoryPort.findByUserIdAndChannelAndType(
                userId, NotificationChannel.IN_APP, NotificationType.RESULT
        )).thenReturn(Optional.empty());
        when(notificationSettingRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(notificationSettingApplicationMapper.toResponse(any())).thenAnswer(inv -> {
            NotificationSettingModel model = inv.getArgument(0);
            return NotificationSettingResponse.builder()
                    .userId(model.getUserId())
                    .channel(model.getChannel())
                    .type(model.getType())
                    .isEnabled(model.isEnabled())
                    .build();
        });

        NotificationSettingResponse response = service.upsertMySetting(
                userId,
                new UpdateMyNotificationSettingRequest(
                        NotificationChannel.IN_APP,
                        NotificationType.RESULT,
                        false
                )
        );

        ArgumentCaptor<NotificationSettingModel> captor = ArgumentCaptor.forClass(NotificationSettingModel.class);
        verify(notificationSettingRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().isEnabled()).isFalse();
        assertThat(response.isEnabled()).isFalse();
    }
}
