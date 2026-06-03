package com.daiphat.coreapi.application.dto.request.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @JsonAlias({"email", "identifier"})
        @NotBlank(message = "Email hoặc username không được để trống.")
        String username,

        @NotBlank(message = "Mật khẩu không được để trống.")
        String password
) {
}
