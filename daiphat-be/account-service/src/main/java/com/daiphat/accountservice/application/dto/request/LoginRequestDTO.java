package com.daiphat.accountservice.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LoginRequestDTO {
    @NotBlank(message = "Username is required")
    String username;
    
    @NotBlank(message = "Password is required")
    String password;

    boolean rememberMe;

    String mfaToken;
}
