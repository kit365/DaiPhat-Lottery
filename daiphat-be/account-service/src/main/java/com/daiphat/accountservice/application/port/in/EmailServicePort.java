package com.daiphat.accountservice.application.port.in;

import com.daiphat.accountservice.domain.model.enums.EmailType;
import java.util.Map;

/**
 * Port đầu vào cho các nghiệp vụ liên quan đến Email.
 * Sử dụng Strategy Pattern để xử lý linh hoạt các tình huống nghiệp vụ.
 */
public interface EmailServicePort {
    /**
     * Gửi Email dựa trên loại nghiệp vụ.
     * @param type Loại Email (WELCOME, OTP...).
     * @param recipient Người nhận.
     * @param data Dữ liệu động cho template.
     */
    void sendEmail(EmailType type, String recipient, Map<String, Object> data);

    void sendAsync(EmailType type, String recipient, Map<String, Object> data);

    /**
     * Xử lý Async Email Task được đẩy từ hàng đợi (Consumer call).
     * @param task DTO chứa thông tin nhiệm vụ.
     */
    void processAsyncEmail(com.daiphat.accountservice.application.dto.event.EmailTaskDTO task);
}
