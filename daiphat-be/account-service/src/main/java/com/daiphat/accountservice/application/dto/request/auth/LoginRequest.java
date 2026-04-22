package com.daiphat.accountservice.application.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LoginRequest {
    @NotBlank(message = "Username không được để trống")
    String username;
    
    @NotBlank(message = "Password không được để trống")
    String password;

    boolean rememberMe;

    String mfaToken;
}
