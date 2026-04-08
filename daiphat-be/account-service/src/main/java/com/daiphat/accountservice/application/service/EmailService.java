package com.daiphat.accountservice.application.service;

import com.daiphat.accountservice.application.port.in.EmailServicePort;
import com.daiphat.accountservice.application.port.out.MailPort;
import com.daiphat.accountservice.application.port.out.auth.AuthCachePort;
import com.daiphat.accountservice.infrastructure.persistence.cache.redis.keys.AuthCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService implements EmailServicePort {

    private final MailPort mailPort;
    private final TemplateEngine templateEngine;
    private final AuthCachePort authCachePort;

    @Override
    @Async("mailExecutor")
    public void sendForgotPasswordEmail(String email, String otp) {
        String lockKey = AuthCacheKeyGenerator.mailLock(email);
        
        // 1. Try to acquire lock for 1 minute
        if (!authCachePort.tryLock(lockKey, Duration.ofMinutes(1))) {
            log.warn("Another mail task is already in progress for {}. Skipping redundant task.", email);
            return;
        }

        try {
            log.info("Rendering and sending forgot-password email to {}", email);
            
            String subject = "Mã xác thực Reset mật khẩu - DaiPhat Platform";
            
            Context context = new Context();
            context.setVariable("otp", otp);
            context.setVariable("email", email);
            
            String htmlContent = templateEngine.process("emails/forgot-password", context);
            mailPort.sendMail(email, subject, htmlContent, true);
            
            log.info("Email sent successfully to {}", email);
        } finally {
            // 2. Always release lock when done
            authCachePort.unlock(lockKey);
        }
    }
}
