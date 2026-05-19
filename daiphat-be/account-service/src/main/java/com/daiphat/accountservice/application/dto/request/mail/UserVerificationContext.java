package com.daiphat.accountservice.application.dto.request.mail;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserVerificationContext {
    private String fullName;
    private String email;
    private String token;
    private String verifyLink;
}
