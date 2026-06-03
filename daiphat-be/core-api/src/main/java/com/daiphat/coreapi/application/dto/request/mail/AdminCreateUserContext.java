package com.daiphat.coreapi.application.dto.request.mail;

import lombok.Builder;

@Builder
public record AdminCreateUserContext(
    String email,
    String fullName,
    String password
) {}
