package com.daiphat.accountservice.application.dto.request.mail;

import lombok.Builder;

@Builder
public record AdminCreateUserContext(
    String firstName,
    String email,
    String password,
    String loginUrl
) {}
