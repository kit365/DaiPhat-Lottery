package com.daiphat.coreapi.application.port.out.notification;

import com.daiphat.coreapi.application.dto.notification.FcmPushData;

public interface FcmPushPort {
    /**
     * Send a Push Notification via Firebase Cloud Messaging.
     *
     * @param fcmToken The registration token of the device.
     * @param title    The notification title.
     * @param body     The notification body.
     * @param data     The notification data payload.
     */
    void sendPushNotification(String fcmToken, String title, String body, FcmPushData data);
}
