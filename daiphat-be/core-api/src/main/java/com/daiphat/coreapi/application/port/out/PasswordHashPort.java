package com.daiphat.coreapi.application.port.out;

public interface PasswordHashPort {
    String encode(String rawPassword);

    boolean matches(String rawPassword, String encodedPassword);
}
