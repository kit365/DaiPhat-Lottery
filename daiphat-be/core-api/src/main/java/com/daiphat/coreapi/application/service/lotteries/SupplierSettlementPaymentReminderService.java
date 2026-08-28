package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationAudience;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.shared.util.SupplierPaymentCutOffCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Reminds admins in the final minutes before {@code paymentCutOffTime}
 * when a settlement is still unpaid / not closed.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierSettlementPaymentReminderService {

    private static final List<SupplierSettlementStatus> OPEN_STATUSES = List.of(
            SupplierSettlementStatus.OPEN,
            SupplierSettlementStatus.RECEIPT_OVERDUE
    );

    private final SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final SupplierPaymentCutOffCalculator paymentCutOffCalculator;
    private final NotificationServicePort notificationService;
    private final UserRepositoryPort userRepositoryPort;
    private final Clock clock;

    private final Set<String> sentReminderKeys = ConcurrentHashMap.newKeySet();

    @Transactional
    public int sendPaymentDueReminders() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        int reminderMinutes = paymentCutOffCalculator.resolvePaymentReminderMinutes();
        int sentCount = 0;

        for (SupplierSettlementModel settlement : supplierSettlementRepositoryPort.findByStatuses(OPEN_STATUSES)) {
            if (settlement == null || settlement.getId() == null || settlement.getPeriodFrom() == null) {
                continue;
            }
            if (!settlement.getPeriodFrom().equals(today)) {
                continue;
            }
            if (settlement.getStatus() == SupplierSettlementStatus.COMPLETED || settlement.getPaidAt() != null) {
                continue;
            }
            if (settlement.getLotterySupplierId() == null) {
                continue;
            }

            LotterySupplierModel supplier = lotterySupplierRepositoryPort.findById(settlement.getLotterySupplierId())
                    .orElse(null);
            if (supplier == null || supplier.getPaymentCutOffTime() == null) {
                continue;
            }
            LocalTime paymentCutOff = supplier.getPaymentCutOffTime();

            LocalDateTime cutOffAt = LocalDateTime.of(today, paymentCutOff);
            LocalDateTime reminderStart = cutOffAt.minusMinutes(reminderMinutes);
            if (now.isBefore(reminderStart) || !now.isBefore(cutOffAt)) {
                continue;
            }

            String reminderKey = settlement.getId() + "_" + today + "_" + paymentCutOff + "_" + reminderMinutes;
            if (!sentReminderKeys.add(reminderKey)) {
                continue;
            }

            notifyPaymentDueSoon(settlement, paymentCutOff, reminderMinutes);
            sentCount++;
        }

        return sentCount;
    }

    private void notifyPaymentDueSoon(
            SupplierSettlementModel settlement,
            LocalTime paymentCutOff,
            int reminderMinutes
    ) {
        String supplierName = settlement.getSupplierName() != null ? settlement.getSupplierName() : "Nhà cung cấp";
        String code = settlement.getSupplierSettlementCode() != null
                ? settlement.getSupplierSettlementCode()
                : String.valueOf(settlement.getId());
        String title = "Sắp đến hạn thanh toán NCC";
        String content = "Kỳ đối soát " + code + " của " + supplierName
                + " còn dưới " + reminderMinutes + " phút trước giờ thanh toán ("
                + paymentCutOff + ") mà chưa hoàn tất thanh toán. Vui lòng xử lý sớm.";

        userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ADMIN)).stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> {
                    NotificationModel notification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(title)
                            .content(content)
                            .type(NotificationType.SYSTEM)
                            .channel(NotificationChannel.IN_APP)
                            .audience(NotificationAudience.STAFF)
                            .referenceId(String.valueOf(settlement.getId()))
                            .referenceType(NotificationReferenceType.SYSTEM)
                            .build();
                    notification.markAsSent();
                    notificationService.createNotification(notification);
                });

        log.info(
                "Sent payment-due reminder for settlement #{} (cutOff={}, reminder={}m)",
                settlement.getId(),
                paymentCutOff,
                reminderMinutes
        );
    }
}
