package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ReturnBatchCutoffTiming;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchReminderService {

    private static final List<ReturnBatchStatus> OPEN_INSPECTION_STATUSES = List.of(
            ReturnBatchStatus.PENDING_INSPECTION,
            ReturnBatchStatus.INSPECTING
    );

    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final NotificationServicePort notificationService;
    private final UserRepositoryPort userRepositoryPort;
    private final Clock clock;

    private final Set<String> sentReminderKeys = ConcurrentHashMap.newKeySet();

    public int sendReturnBatchInspectionReminders() {
        LocalDateTime now = LocalDateTime.now(clock);
        int bufferMinutes = importBatchConfigResolver.resolveReturnBufferMinutes();
        int sentCount = 0;

        for (ReturnBatchModel batch : returnBatchRepositoryPort.findByStatuses(OPEN_INSPECTION_STATUSES)) {
            if (batch == null || batch.getId() == null || batch.getDrawDate() == null || batch.getReturnCutOffTime() == null) {
                continue;
            }

            boolean inWindow = ReturnBatchCutoffTiming.isInInspectionWindow(
                    batch.getDrawDate(),
                    batch.getReturnCutOffTime(),
                    now,
                    bufferMinutes
            );

            if (!inWindow) {
                continue;
            }

            String reminderKey = batch.getId() + "_" + batch.getDrawDate() + "_" + batch.getReturnCutOffTime();
            if (sentReminderKeys.contains(reminderKey)) {
                continue;
            }

            String supplierName = batch.getSupplierName() != null ? batch.getSupplierName() : "Nhà cung cấp";
            String title = "Nhắc nhở kiểm vé trả nhà cung cấp";
            String content = "Phiếu trả vé #" + batch.getId() + " (" + supplierName
                    + ") sắp đến hạn trả vé lúc " + batch.getReturnCutOffTime()
                    + ". Vui lòng hoàn tất kiểm vé và bàn giao.";

            userRepositoryPort.findAll().stream()
                    .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                    .forEach(user -> {
                        NotificationModel notification = NotificationModel.builder()
                                .userId(user.getId())
                                .title(title)
                                .content(content)
                                .type(NotificationType.SYSTEM)
                                .channel(NotificationChannel.IN_APP)
                                .referenceId(String.valueOf(batch.getId()))
                                .referenceType(NotificationReferenceType.SYSTEM)
                                .build();
                        notification.markAsSent();
                        notificationService.createNotification(notification);
                    });

            sentReminderKeys.add(reminderKey);
            sentCount++;
            log.info("Sent in-app return batch reminder notification for batch #{}", batch.getId());
        }

        return sentCount;
    }
}
