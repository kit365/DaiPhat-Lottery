package com.daiphat.coreapi.application.port.out.auth;

public interface PasswordHashPort {
    String encode(String rawPassword);

    boolean matches(String rawPassword, String encodedPassword);
}
