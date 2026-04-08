package com.daiphat.accountservice.application.port.out;

public interface MailPort {
    void sendMail(String to, String subject, String content, boolean isHtml);
}
