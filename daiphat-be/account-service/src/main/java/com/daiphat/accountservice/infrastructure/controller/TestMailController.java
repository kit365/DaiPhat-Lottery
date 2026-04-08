package com.daiphat.accountservice.infrastructure.controller;

import com.daiphat.accountservice.application.port.out.MailPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Controller phục vụ việc kiểm thử chức năng gửi Email.
 * Sử dụng hệ thống Atomic Template (Fragments).
 */
@RestController
@RequestMapping("/api/v1/test")
@Slf4j
@RequiredArgsConstructor
public class TestMailController {

    private final MailPort mailPort;
    private final TemplateEngine templateEngine;

    @GetMapping("/mail")
    public String sendTestMail(@RequestParam String to) {
        try {
            log.info("Atomic trial email requested for: {}", to);

            // 1. Chuẩn bị dữ liệu cho Template (Data Context)
            Context context = new Context();
            context.setVariable("subject", "Confirm your email address - Atomic Edition");
            context.setVariable("title", "Confirm your email address");
            context.setVariable("description", "Your confirmation code is below - enter it in your open browser window and we'll help you get signed in.");
            context.setVariable("code", "DFY-X7U");

            // 2. Render toàn bộ Email từ các mảnh ghép (Atomic Rendering)
            // Template: emails/test-otp.html
            String htmlContent = templateEngine.process("emails/test-otp", context);

            // 3. Thực hiện gửi mail thông qua Port
            mailPort.sendMail(to, (String) context.getVariable("subject"), htmlContent, true);

            return "Test email sent successfully (Atomic Fragments) to: " + to;
        } catch (Exception e) {
            log.error("An error occurred during atomic email sending", e);
            return "Failed to send test email: " + e.getMessage();
        }
    }
}
