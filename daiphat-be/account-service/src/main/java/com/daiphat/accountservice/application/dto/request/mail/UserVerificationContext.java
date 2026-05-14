package com.daiphat.accountservice.application.dto.request.mail;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserVerificationContext {
    private String firstName;
    private String email;
    private String token;
    private String verifyLink;
}
