package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Auto-cancels outdated import batch lines:
 * <ul>
 *   <li>Past draw dates (IN_DAY; POST_DRAW_SUPPLEMENT and ADJUSTMENT lines exempt)</li>
 *   <li>Same-day IN_DAY batches once ticket intake closes
 *       ({@code returnCutOffTime − RETURN_BUFFER})</li>
 * </ul>
 * Incomplete {@code IMPORTING} tickets on cancelled lines are hard-purged.
 * Operators receive an in-app notification when lines or the whole batch are auto-cancelled.
 */
@Service
@Slf4j
public class ImportBatchDraftExpiryService {

    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final SupplierTicketIntakeWindowPolicy intakeWindowPolicy;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final NotificationServicePort notificationService;
    private final UserRepositoryPort userRepositoryPort;
    private final Clock clock;

    public ImportBatchDraftExpiryService(
            ImportBatchRepositoryPort importBatchRepositoryPort,
            ImportBatchLineRepositoryPort importBatchLineRepositoryPort,
            LotteryStationServicePort lotteryStationServicePort,
            LotterySupplierRepositoryPort lotterySupplierRepositoryPort,
            SupplierTicketIntakeWindowPolicy intakeWindowPolicy,
            @Lazy LotteryTicketServicePort lotteryTicketServicePort,
            NotificationServicePort notificationService,
            UserRepositoryPort userRepositoryPort,
            Clock clock
    ) {
        this.importBatchRepositoryPort = importBatchRepositoryPort;
        this.importBatchLineRepositoryPort = importBatchLineRepositoryPort;
        this.lotteryStationServicePort = lotteryStationServicePort;
        this.lotterySupplierRepositoryPort = lotterySupplierRepositoryPort;
        this.intakeWindowPolicy = intakeWindowPolicy;
        this.lotteryTicketServicePort = lotteryTicketServicePort;
        this.notificationService = notificationService;
        this.userRepositoryPort = userRepositoryPort;
        this.clock = clock;
    }

    @Transactional
    public int cancelOverdueDrafts() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        int cancelledBatchCount = 0;

        Map<Long, ImportBatchModel> candidates = new LinkedHashMap<>();
        for (ImportBatchModel batch : importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(today)) {
            if (batch.getId() != null) {
                candidates.put(batch.getId(), batch);
            }
        }
        for (ImportBatchModel batch : importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(today)) {
            if (batch.getId() != null) {
                candidates.putIfAbsent(batch.getId(), batch);
            }
        }

        for (ImportBatchModel batch : candidates.values()) {
            if (processBatchExpiry(batch, now)) {
                cancelledBatchCount++;
            }
        }

        return cancelledBatchCount;
    }

    @Transactional
    public boolean cancelIfOverdue(ImportBatchModel batch) {
        if (batch == null || !batch.isEditable()) {
            return false;
        }

        return processBatchExpiry(batch, LocalDateTime.now(clock));
    }

    private boolean processBatchExpiry(ImportBatchModel batch, LocalDateTime now) {
        if (!batch.isEditable() || batch.isExemptFromAutoCancellation()) {
            return false;
        }

        ensureLinesLoaded(batch);
        LocalDate today = now.toLocalDate();
        LotterySupplierModel supplier = resolveSupplier(batch);
        boolean anyLineCancelled = false;
        int cancelledLineCount = 0;
        boolean sameDayDeadline = false;

        for (ImportBatchLineModel line : batch.getActiveLines()) {
            if (!isCancellableLine(line)) {
                continue;
            }

            String cancelReason = resolveLineCancelReason(batch, line, supplier, today, now);
            if (cancelReason == null) {
                continue;
            }

            if (line.getId() != null) {
                lotteryTicketServicePort.purgeImportBatchLineTickets(line.getId());
            }
            line.markCancelled(now, cancelReason);
            importBatchLineRepositoryPort.save(line);
            anyLineCancelled = true;
            cancelledLineCount++;
            if (cancelReason.contains("same-day import deadline")) {
                sameDayDeadline = true;
            }
            log.info(
                    "Auto-cancelled import batch line #{} for station {} (batch #{}): {}",
                    line.getId(),
                    line.getLotteryStationId(),
                    batch.getId(),
                    cancelReason
            );
        }

        if (anyLineCancelled) {
            batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batch.getId()));
            batch.recalculateAggregates();
            batch.refreshImportStatus(now);
        }

        if (batch.areAllActiveLinesCancelled()) {
            batch.markCancelled(now, ImportBatchCancelReason.ALL_LINES_CANCELLED);
            importBatchRepositoryPort.save(batch);
            log.info(
                    "Auto-cancelled import batch #{} because all lines were cancelled (draw date {})",
                    batch.getId(),
                    batch.getDrawDate()
            );
            notifyImportBatchAutoCancelled(batch, cancelledLineCount, true, sameDayDeadline);
            return true;
        }

        if (anyLineCancelled) {
            importBatchRepositoryPort.save(batch);
            notifyImportBatchAutoCancelled(batch, cancelledLineCount, false, sameDayDeadline);
        }

        return batch.getStatus() == ImportBatchStatus.CANCELLED;
    }

    private void notifyImportBatchAutoCancelled(
            ImportBatchModel batch,
            int cancelledLineCount,
            boolean entireBatchCancelled,
            boolean sameDayDeadline
    ) {
        if (batch == null || batch.getId() == null || notificationService == null || userRepositoryPort == null) {
            return;
        }

        String batchLabel = batch.getBatchCode() != null && !batch.getBatchCode().isBlank()
                ? batch.getBatchCode()
                : "#" + batch.getId();
        String supplierName = batch.getSupplierName();
        if (supplierName == null || supplierName.isBlank()) {
            LotterySupplierModel supplier = resolveSupplier(batch);
            supplierName = supplier != null && supplier.getName() != null ? supplier.getName() : "Nhà cung cấp";
        }
        String drawDateLabel = batch.getDrawDate() != null ? batch.getDrawDate().toString() : "-";
        String deadlineHint = sameDayDeadline
                ? "đã đến giờ kiểm vé / chốt nhập"
                : "ngày quay đã qua trong khi nhập chưa hoàn tất";

        String title;
        String content;
        if (entireBatchCancelled) {
            title = "Phiếu nhập lô đã bị hủy tự động";
            content = "Phiếu nhập " + batchLabel + " của " + supplierName
                    + " (ngày quay " + drawDateLabel + ") đã bị hủy tự động vì " + deadlineHint + ".";
        } else {
            title = "Một phần phiếu nhập lô đã bị hủy tự động";
            content = "Phiếu nhập " + batchLabel + " của " + supplierName
                    + " (ngày quay " + drawDateLabel + "): đã tự động hủy "
                    + cancelledLineCount + " dòng nhập chưa hoàn tất vì " + deadlineHint
                    + ". Các dòng đã nhập đủ vẫn được giữ.";
        }

        Set<UUID> recipientIds = new LinkedHashSet<>();
        if (batch.getImportedBy() != null) {
            recipientIds.add(batch.getImportedBy());
        }
        userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ADMIN)).stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE && u.getId() != null)
                .map(UserModel::getId)
                .forEach(recipientIds::add);

        for (UUID userId : recipientIds) {
            NotificationModel notification = NotificationModel.builder()
                    .userId(userId)
                    .title(title)
                    .content(content)
                    .type(NotificationType.SYSTEM)
                    .channel(NotificationChannel.IN_APP)
                    .referenceId(String.valueOf(batch.getId()))
                    .referenceType(NotificationReferenceType.SYSTEM)
                    .build();
            notification.markAsSent();
            notificationService.createNotification(notification);
        }

        log.info(
                "Sent import-batch auto-cancel notification for batch #{} to {} recipient(s)",
                batch.getId(),
                recipientIds.size()
        );
    }

    private String resolveLineCancelReason(
            ImportBatchModel batch,
            ImportBatchLineModel line,
            LotterySupplierModel supplier,
            LocalDate today,
            LocalDateTime now
    ) {
        if (batch.isExemptFromAutoCancellation() || line.isExemptFromAutoCancellation()) {
            return null;
        }

        if (batch.hasExpiredDrawDate(today)) {
            return ImportBatchLineCancelReason.drawDateExpired(resolveStationName(line.getLotteryStationId()));
        }

        if (batch.isSubjectToSameDayCutoffCancellation(today)
                && intakeWindowPolicy.isIntakeClosed(supplier, batch.getDrawDate(), now)) {
            return ImportBatchLineCancelReason.importDeadlinePassed(
                    resolveStationName(line.getLotteryStationId())
            );
        }

        return null;
    }

    private LotterySupplierModel resolveSupplier(ImportBatchModel batch) {
        if (batch.getSupplierId() == null) {
            return null;
        }
        return lotterySupplierRepositoryPort.findById(batch.getSupplierId()).orElse(null);
    }

    private void ensureLinesLoaded(ImportBatchModel batch) {
        if (batch.getId() == null) {
            return;
        }
        List<ImportBatchLineModel> lines = batch.getActiveLines();
        if (lines == null || lines.isEmpty()) {
            batch.setLines(importBatchLineRepositoryPort.findByImportBatchId(batch.getId()));
        }
    }

    private String resolveStationName(Long stationId) {
        if (stationId == null) {
            return null;
        }
        LotteryStationModel station = lotteryStationServicePort.getModelById(stationId);
        return station != null ? station.getName() : null;
    }

    private boolean isCancellableLine(ImportBatchLineModel line) {
        if (line.isExemptFromAutoCancellation()) {
            return false;
        }
        ImportBatchLineStatus status = line.getStatus();
        return status == ImportBatchLineStatus.OPEN
                || status == ImportBatchLineStatus.IMPORTING
                || status == ImportBatchLineStatus.PAUSED;
    }
}
