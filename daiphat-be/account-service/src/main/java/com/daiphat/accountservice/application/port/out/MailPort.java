package com.daiphat.accountservice.application.port.out;

/**
 * Port xuất cho chức năng gửi thư điện tử.
 * Tuân thủ Clean Architecture: Application Layer không phụ thuộc vào thư viện gửi mail cụ thể.
 */
public interface MailPort {
    void sendMail(String to, String subject, String content, boolean isHtml);
}
