package com.daiphat.coreapi.infrastructure.persistence.adapter.notification;

import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class FcmPushAdapter implements FcmPushPort {

    @Override
    public void sendPushNotification(String fcmToken, String title, String body, FcmPushData data) {
        if (fcmToken == null || fcmToken.trim().isEmpty()) {
            log.warn("Cannot send Push Notification: FCM Token is empty.");
            return;
        }

        try {
            var builder = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build());
            
            if (data != null) {
                java.util.Map<String, String> dataMap = data.toMap();
                if (!dataMap.isEmpty()) {
                    builder.putAllData(dataMap);
                }
            }
            
            Message message = builder.build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Successfully sent push notification to token: {}, response: {}", fcmToken, response);
        } catch (Exception e) {
            log.error("Failed to send push notification to token: {}. Error: {}", fcmToken, e.getMessage(), e);
        }
    }
}
