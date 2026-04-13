package com.daiphat.accountservice.application.strategy.email;

import com.daiphat.accountservice.domain.model.enums.EmailType;
import java.util.Map;

public interface EmailStrategy {
    /**
     * Trả về loại Email mà Strategy này xử lý.
     */
    EmailType getSupportedType();

    boolean checkRateLimit(String recipient);

    long getRemainingWaitTime(String recipient);

    /**
     * Thực hiện xử lý logic nghiệp vụ và kích hoạt gửi mail.
     * @param recipient Người nhận.
     * @param data Dữ liệu động để render.
     */
    void process(String recipient, Map<String, Object> data);
}
