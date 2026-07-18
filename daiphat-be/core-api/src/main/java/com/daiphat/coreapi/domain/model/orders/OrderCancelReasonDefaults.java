package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;

/**
 * Default Vietnamese cancel reasons keyed by {@link OrderCancelType}.
 */
public final class OrderCancelReasonDefaults {

    public static final String CUSTOMER_REQUEST = "Khách hàng hủy đơn trong thời gian cho phép";
    public static final String ADMIN_FORCE_CANCEL = "Nhân viên hủy đơn theo yêu cầu hỗ trợ khách hàng";
    public static final String SYSTEM_PAYMENT_TIMEOUT = "Quá thời gian thanh toán 3 phút.";

    public static String systemPaymentTimeout(int minutes) {
        int safeMinutes = minutes > 0 ? minutes : 3;
        return "Quá thời gian thanh toán " + safeMinutes + " phút.";
    }
    public static final String OUT_OF_STOCK_INCIDENT =
            "Hủy đơn do sự cố kho — toàn bộ vé không thể giao và không còn vé thay thế";

    private OrderCancelReasonDefaults() {
    }

    public static String forType(OrderCancelType cancelType) {
        if (cancelType == null) {
            return null;
        }
        return switch (cancelType) {
            case CUSTOMER_REQUEST -> CUSTOMER_REQUEST;
            case ADMIN_FORCE_CANCEL -> ADMIN_FORCE_CANCEL;
            case SYSTEM_PAYMENT_TIMEOUT -> SYSTEM_PAYMENT_TIMEOUT;
            case OUT_OF_STOCK_INCIDENT -> OUT_OF_STOCK_INCIDENT;
        };
    }

    public static String resolve(OrderCancelType cancelType, String overrideReason) {
        if (overrideReason != null && !overrideReason.isBlank()) {
            return overrideReason.trim();
        }
        String defaults = forType(cancelType);
        if (defaults == null || defaults.isBlank()) {
            throw new IllegalArgumentException("cancelReason is required when cancelType has no default");
        }
        return defaults;
    }
}
