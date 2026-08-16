package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.response.support.OrderComplaintEligibilityResponse;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.service.order.OrderPaymentSuccessTimeResolver;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderComplaintEligibilityService {

    public static final String CATEGORY_PAYMENT_SYNC_ERROR = "PAYMENT_SYNC_ERROR";
    public static final String CATEGORY_PREPARATION_DELAY = "ORDER_PREPARATION_DELAY";
    public static final String CATEGORY_PICKUP_ISSUE = "ORDER_PICKUP_ISSUE";
    public static final String CATEGORY_SERVICE_QUALITY = "ORDER_SERVICE_QUALITY";
    public static final String CATEGORY_CANCELLED_OUT_OF_STOCK = "ORDER_CANCELLED_OUT_OF_STOCK";

    public static final String REASON_ELIGIBLE = "eligible";
    public static final String REASON_TOO_EARLY = "too_early";
    public static final String REASON_WINDOW_EXPIRED = "window_expired";
    public static final String REASON_STATUS_INVALID = "status_invalid";
    public static final String REASON_NOT_ELIGIBLE = "not_eligible";

    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final Set<String> ORDER_COMPLAINT_CATEGORIES = Set.of(
            CATEGORY_PAYMENT_SYNC_ERROR,
            CATEGORY_PREPARATION_DELAY,
            CATEGORY_PICKUP_ISSUE,
            CATEGORY_SERVICE_QUALITY,
            CATEGORY_CANCELLED_OUT_OF_STOCK);

    private final OrderRepositoryPort orderRepositoryPort;
    private final OrderPaymentSuccessTimeResolver paymentSuccessTimeResolver;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public OrderComplaintEligibilityResponse evaluate(UUID orderId, UUID customerId) {
        OrderModel order = loadOwnedOrder(orderId, customerId);
        return evaluateOrder(order, LocalDateTime.now(ZONE_ID));
    }

    public void validate(TicketCategoryModel category, String refId, UUID customerId) {
        String code = category.getCode() != null ? category.getCode().trim() : "";
        if (!ORDER_COMPLAINT_CATEGORIES.contains(code)) {
            // Allow legacy ORDER categories that are not gated by the new workflow.
            loadOwnedOrder(parseOrderId(refId), customerId);
            return;
        }

        OrderModel order = loadOwnedOrder(parseOrderId(refId), customerId);
        OrderComplaintEligibilityResponse eligibility = evaluateOrder(order, LocalDateTime.now(ZONE_ID));
        if (!eligibility.eligible()) {
            throw new DomainException(ErrorCode.TICKET_ORDER_COMPLAINT_NOT_ELIGIBLE, null, eligibility.message());
        }
        if (!code.equals(eligibility.categoryCode())) {
            throw new DomainException(ErrorCode.TICKET_ORDER_COMPLAINT_CATEGORY_MISMATCH);
        }
    }

    public boolean requiresEvidence(TicketCategoryModel category) {
        String code = category.getCode() != null ? category.getCode().trim() : "";
        return CATEGORY_PAYMENT_SYNC_ERROR.equals(code);
    }

    public OrderComplaintEligibilityResponse evaluateOrder(OrderModel order, LocalDateTime now) {
        OrderStatus status = order.getStatus();
        if (status == OrderStatus.CANCELLED) {
            if (order.getCancelType() == OrderCancelType.SYSTEM_PAYMENT_TIMEOUT) {
                return eligible(
                        order,
                        CATEGORY_PAYMENT_SYNC_ERROR,
                        "Bạn có thể gửi khiếu nại lỗi đồng bộ thanh toán. Vui lòng đính kèm biên lai chuyển khoản.",
                        true,
                        null,
                        null);
            }
            if (order.getCancelType() == OrderCancelType.OUT_OF_STOCK_INCIDENT) {
                return evaluateOutOfStockCancellation(order, now);
            }
            String cancelReasonMsg = "Đơn hàng đã hủy vì lý do này không hỗ trợ gửi khiếu nại.";
            if (order.getCancelType() == OrderCancelType.CUSTOMER_REQUEST) {
                cancelReasonMsg = "Đơn hàng do bạn chủ động hủy nên không hỗ trợ gửi khiếu nại.";
            } else if (order.getCancelType() == OrderCancelType.ADMIN_FORCE_CANCEL) {
                cancelReasonMsg = "Đơn hàng đã được nhân viên hỗ trợ hủy nên không thể gửi khiếu nại.";
            }
            return ineligible(
                    order,
                    null,
                    REASON_STATUS_INVALID,
                    cancelReasonMsg,
                    false,
                    null,
                    null);
        }

        if (status == OrderStatus.PAID || status == OrderStatus.PREPARING) {
            return evaluatePreparationDelay(order, now);
        }

        if (status == OrderStatus.PENDING_PICKUP) {
            return eligible(
                    order,
                    CATEGORY_PICKUP_ISSUE,
                    "Bạn có thể gửi khiếu nại vì không nhận được vé.",
                    false,
                    null,
                    null);
        }

        if (status == OrderStatus.COMPLETED) {
            return evaluateServiceQuality(order, now);
        }

        return ineligible(
                order,
                null,
                REASON_STATUS_INVALID,
                "Đơn hàng ở trạng thái hiện tại không hỗ trợ gửi khiếu nại.",
                false,
                null,
                null);
    }

    private OrderComplaintEligibilityResponse evaluatePreparationDelay(OrderModel order, LocalDateTime now) {
        LocalTime cutoff = getDrawCutoffTime();
        LocalDateTime cutoffToday = LocalDate.now(ZONE_ID).atTime(cutoff);
        if (!now.isBefore(cutoffToday)) {
            return eligible(
                    order,
                    CATEGORY_PREPARATION_DELAY,
                    "Bạn có thể gửi khiếu nại vì cửa hàng chuẩn bị đơn chậm gần giờ mở thưởng.",
                    false,
                    null,
                    null);
        }

        int delayMinutes = getStatusDelayComplaintMinutes();
        LocalDateTime statusChangedAt = resolveLastStatusChangeTime(order);
        if (statusChangedAt == null) {
            return ineligible(
                    order,
                    CATEGORY_PREPARATION_DELAY,
                    REASON_NOT_ELIGIBLE,
                    "Chưa xác định được thời điểm cập nhật trạng thái để kiểm tra khiếu nại xử lý chậm.",
                    false,
                    null,
                    null);
        }

        LocalDateTime eligibleAt = statusChangedAt.plusMinutes(delayMinutes);
        if (now.isBefore(eligibleAt)) {
            long remainingSeconds = Math.max(Duration.between(now, eligibleAt).toSeconds(), 0L);
            return ineligible(
                    order,
                    CATEGORY_PREPARATION_DELAY,
                    REASON_TOO_EARLY,
                    "Bạn có thể khiếu nại nếu đơn không đổi trạng thái sau " + delayMinutes
                            + " phút. Vui lòng chờ thêm trong khi cửa hàng xử lý đơn.",
                    false,
                    remainingSeconds,
                    eligibleAt);
        }

        return eligible(
                order,
                CATEGORY_PREPARATION_DELAY,
                "Bạn có thể gửi khiếu nại vì đơn hàng không đổi trạng thái quá "
                        + delayMinutes + " phút.",
                false,
                null,
                null);
    }

    private OrderComplaintEligibilityResponse evaluateOutOfStockCancellation(OrderModel order, LocalDateTime now) {
        LocalDateTime cancelledAt = order.getCancelledAt();
        if (cancelledAt == null) {
            return ineligible(
                    order,
                    CATEGORY_CANCELLED_OUT_OF_STOCK,
                    REASON_NOT_ELIGIBLE,
                    "Chưa xác định được thời điểm hủy đơn để kiểm tra khiếu nại.",
                    false,
                    null,
                    null);
        }

        int windowHours = getCancelledComplaintWindowHours();
        LocalDateTime expiresAt = cancelledAt.plusHours(windowHours);
        if (now.isAfter(expiresAt)) {
            return ineligible(
                    order,
                    CATEGORY_CANCELLED_OUT_OF_STOCK,
                    REASON_WINDOW_EXPIRED,
                    "Đã hết thời hạn khiếu nại cho đơn bị hủy do hết vé (trong vòng "
                            + windowHours + " giờ sau khi hủy).",
                    false,
                    0L,
                    expiresAt);
        }

        long remainingSeconds = Math.max(Duration.between(now, expiresAt).toSeconds(), 0L);
        return eligible(
                order,
                CATEGORY_CANCELLED_OUT_OF_STOCK,
                "Bạn có thể gửi khiếu nại cho đơn bị hủy do sự cố hết vé trong vòng "
                        + windowHours + " giờ sau khi hủy.",
                false,
                remainingSeconds,
                expiresAt);
    }

    private OrderComplaintEligibilityResponse evaluateServiceQuality(OrderModel order, LocalDateTime now) {
        LocalDateTime completedAt = order.getActualPickedUpAt();
        if (completedAt == null) {
            return ineligible(
                    order,
                    CATEGORY_SERVICE_QUALITY,
                    REASON_NOT_ELIGIBLE,
                    "Chưa xác định được thời điểm hoàn thành đơn để kiểm tra khiếu nại dịch vụ.",
                    false,
                    null,
                    null);
        }

        int windowHours = getServiceComplaintWindowHours();
        LocalDateTime expiresAt = completedAt.plusHours(windowHours);
        if (now.isAfter(expiresAt)) {
            return ineligible(
                    order,
                    CATEGORY_SERVICE_QUALITY,
                    REASON_WINDOW_EXPIRED,
                    "Đã hết thời hạn khiếu nại chất lượng dịch vụ (trong vòng "
                            + windowHours + " giờ sau khi hoàn thành đơn).",
                    false,
                    0L,
                    expiresAt);
        }

        long remainingSeconds = Math.max(Duration.between(now, expiresAt).toSeconds(), 0L);
        return eligible(
                order,
                CATEGORY_SERVICE_QUALITY,
                "Bạn có thể gửi khiếu nại về thái độ/chất lượng dịch vụ trong vòng "
                        + windowHours + " giờ sau khi hoàn thành đơn.",
                false,
                remainingSeconds,
                expiresAt);
    }

    private OrderComplaintEligibilityResponse eligible(
            OrderModel order,
            String categoryCode,
            String message,
            boolean requiresEvidence,
            Long remainingSeconds,
            LocalDateTime expiresAt) {
        return new OrderComplaintEligibilityResponse(
                true,
                categoryCode,
                REASON_ELIGIBLE,
                message,
                requiresEvidence,
                remainingSeconds,
                null,
                expiresAt,
                order.getId(),
                order.getStatus() != null ? order.getStatus().name() : null);
    }

    private OrderComplaintEligibilityResponse ineligible(
            OrderModel order,
            String categoryCode,
            String reasonCode,
            String message,
            boolean requiresEvidence,
            Long remainingSeconds,
            LocalDateTime eligibleOrExpiresAt) {
        boolean tooEarly = REASON_TOO_EARLY.equals(reasonCode);
        return new OrderComplaintEligibilityResponse(
                false,
                categoryCode,
                reasonCode,
                message,
                requiresEvidence,
                remainingSeconds,
                tooEarly ? eligibleOrExpiresAt : null,
                tooEarly ? null : eligibleOrExpiresAt,
                order.getId(),
                order.getStatus() != null ? order.getStatus().name() : null);
    }

    private OrderModel loadOwnedOrder(UUID orderId, UUID customerId) {
        OrderModel order = orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.TICKET_REF_INVALID));
        if (customerId == null || !customerId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.TICKET_REF_ORDER_MISMATCH);
        }
        return order;
    }

    private UUID parseOrderId(String refId) {
        try {
            return UUID.fromString(refId.trim());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }
    }

    /**
     * Anchor for the "status unchanged" rule. Orders are audited, so updatedAt tracks
     * the latest status transition; payment time and createdAt are safe fallbacks.
     */
    private LocalDateTime resolveLastStatusChangeTime(OrderModel order) {
        if (order.getUpdatedAt() != null) {
            return order.getUpdatedAt();
        }
        LocalDateTime paidAt = resolvePaymentSuccessTime(order);
        if (paidAt != null) {
            return paidAt;
        }
        return order.getCreatedAt();
    }

    private LocalDateTime resolvePaymentSuccessTime(OrderModel order) {
        return paymentSuccessTimeResolver.resolve(order).orElse(null);
    }

    int getStatusDelayComplaintMinutes() {
        return parsePositiveInt(
                SystemConfigEnum.ORDER_STATUS_DELAY_COMPLAINT_MINUTES,
                Integer.parseInt(SystemConfigEnum.ORDER_STATUS_DELAY_COMPLAINT_MINUTES.getDefaultValue()));
    }

    int getCancelledComplaintWindowHours() {
        return parsePositiveInt(
                SystemConfigEnum.ORDER_CANCELLED_COMPLAINT_WINDOW_HOURS,
                Integer.parseInt(SystemConfigEnum.ORDER_CANCELLED_COMPLAINT_WINDOW_HOURS.getDefaultValue()));
    }

    LocalTime getDrawCutoffTime() {
        String defaultValue = SystemConfigEnum.ORDER_COMPLAINT_DRAW_CUTOFF_TIME.getDefaultValue();
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.ORDER_COMPLAINT_DRAW_CUTOFF_TIME.name())
                .map(SystemConfigModel::getConfigValue)
                .map(raw -> parseTime(raw, defaultValue))
                .orElseGet(() -> LocalTime.parse(defaultValue, TIME_FORMATTER));
    }

    int getServiceComplaintWindowHours() {
        return parsePositiveInt(
                SystemConfigEnum.ORDER_SERVICE_COMPLAINT_WINDOW_HOURS,
                Integer.parseInt(SystemConfigEnum.ORDER_SERVICE_COMPLAINT_WINDOW_HOURS.getDefaultValue()));
    }

    private int parsePositiveInt(SystemConfigEnum configEnum, int defaultValue) {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(configEnum.name())
                .map(SystemConfigModel::getConfigValue)
                .map(raw -> {
                    try {
                        int value = Integer.parseInt(raw.trim());
                        return value > 0 ? value : defaultValue;
                    } catch (NumberFormatException ex) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    private LocalTime parseTime(String rawValue, String defaultValue) {
        try {
            return LocalTime.parse(rawValue.trim(), TIME_FORMATTER);
        } catch (DateTimeParseException | NullPointerException ex) {
            return LocalTime.parse(defaultValue, TIME_FORMATTER);
        }
    }

    public static boolean isOrderComplaintCategory(TicketCategoryModel category) {
        if (category == null || category.getRequiredRefType() != TicketRefType.ORDER) {
            return false;
        }
        String code = category.getCode() != null ? category.getCode().trim() : "";
        return ORDER_COMPLAINT_CATEGORIES.contains(code);
    }
}
