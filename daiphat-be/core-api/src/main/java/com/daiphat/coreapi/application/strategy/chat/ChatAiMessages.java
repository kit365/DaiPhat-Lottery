package com.daiphat.coreapi.application.strategy.chat;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ChatAiMessages {

    public static final String HANDOFF =
            "Đang kết nối bạn với nhân viên hỗ trợ. Vui lòng đợi trong giây lát.";
    public static final String UNAVAILABLE =
            "Hệ thống AI tạm thời không khả dụng. Bạn vui lòng thử lại sau hoặc bấm \"Trò chuyện với nhân viên hỗ trợ\" nếu cần.";
    public static final String DISABLED =
            "Trợ lý AI hiện chưa được kích hoạt. Tin nhắn của bạn đã được ghi nhận.";
    public static final String NO_OPERATOR_ONLINE =
            "Hiện chưa có nhân viên trực tuyến. Chúng tôi sẽ phản hồi sớm nhất có thể.";
    public static final String NOT_UNDERSTOOD =
            "Xin lỗi, mình chưa hiểu rõ yêu cầu. Bạn có thể hỏi về lịch quay, kết quả xổ số hoặc đơn hàng. "
                    + "Nếu cần gặp nhân viên, bấm \"Trò chuyện với nhân viên hỗ trợ\" bên dưới.";
    public static final String UNHANDLED_INTENT = NOT_UNDERSTOOD;
}
