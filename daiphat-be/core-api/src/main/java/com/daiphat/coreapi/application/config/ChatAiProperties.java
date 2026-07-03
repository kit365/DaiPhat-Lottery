package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.ai")
public class ChatAiProperties {

    private boolean enabled = false;
    private double confidenceThreshold = 0.7;
    private String botDisplayName = "Đại Phát AI Bot";
    private String handoffMessage = "Đang kết nối bạn với nhân viên hỗ trợ. Vui lòng đợi trong giây lát.";
    private String unavailableMessage = "Hệ thống AI tạm thời không khả dụng. Đang chuyển cho nhân viên hỗ trợ.";
    private String disabledMessage =
            "Trợ lý AI hiện chưa được kích hoạt. Tin nhắn của bạn đã được ghi nhận.";
    private String noOperatorOnlineMessage =
            "Hiện chưa có nhân viên trực tuyến. Chúng tôi sẽ phản hồi sớm nhất có thể.";
    private String unhandledIntentMessage =
            "Dạ hệ thống đã ghi nhận yêu cầu của bạn, nhưng AI hiện tại chưa thể xử lý logic chi tiết này. Đang chuyển tiếp cho nhân viên...";

    private Service service = new Service();

    @Getter
    @Setter
    public static class Service {
        /** Full classify endpoint, e.g. <a href="http://localhost:8000/v1/chat/classify">...</a> */
        private String classifyUrl = "http://localhost:8000/v1/chat/classify";
        private int connectTimeoutMs = 3000;
        private int readTimeoutMs = 5000;
    }
}
