package com.daiphat.coreapi.application.constant.chat.intent;

/**
 * Test-only shim aligning with WebAccountIntentStrategy + chat-messages.yml account section.
 */
public final class ChatWebAccountMessages {

    public static final int ORDER_LOOKUP_PAGE = 1;
    public static final int ORDER_LOOKUP_SIZE = 1;
    public static final String ORDER_LOOKUP_SORT_BY = "createdAt";
    public static final String ORDER_LOOKUP_DIRECTION = "DESC";

    public static final String NO_ORDERS_MESSAGE =
            "Bạn chưa có đơn hàng nào trên tài khoản. Bạn có thể mua vé trực tuyến trên website hoặc nhắn nhân viên nếu cần hỗ trợ.";
    public static final String LATEST_ORDER_PREFIX = "Đơn hàng gần nhất của bạn: ";
    public static final String LATEST_ORDER_STATUS_SEPARATOR = " — trạng thái ";
    public static final String LATEST_ORDER_CREATED_AT_PREFIX = " (";
    public static final String LATEST_ORDER_CREATED_AT_SUFFIX = ")";
    public static final String LATEST_ORDER_FOOTER =
            ". Xem chi tiết tại mục Đơn hàng của tôi trên website.";
    public static final String LOOKUP_FAILED_MESSAGE =
            "Bạn có thể xem đơn hàng tại mục Đơn hàng của tôi trên website. Nếu cần hỗ trợ thanh toán hoặc nhận vé, hãy nhắn \"gặp nhân viên\".";

    private ChatWebAccountMessages() {
    }
}
