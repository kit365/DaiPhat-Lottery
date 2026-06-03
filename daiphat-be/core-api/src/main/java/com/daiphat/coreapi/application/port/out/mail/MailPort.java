package com.daiphat.coreapi.application.port.out.mail;

public interface MailPort {
    void sendMail(String to, String subject, String content, boolean isHtml);
}
