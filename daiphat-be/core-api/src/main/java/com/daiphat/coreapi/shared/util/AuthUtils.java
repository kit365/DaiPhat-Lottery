package com.daiphat.coreapi.shared.util;

import java.security.SecureRandom;

public final class AuthUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private AuthUtils() {
    }

    public static String generatePassword() {
        String upperCaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lowerCaseLetters = "abcdefghijklmnopqrstuvwxyz";
        String numbers = "0123456789";
        String allCharacters = upperCaseLetters + lowerCaseLetters + numbers;

        StringBuilder password = new StringBuilder();
        password.append(upperCaseLetters.charAt(SECURE_RANDOM.nextInt(upperCaseLetters.length())));
        for (int i = 0; i < 11; i++) {
            password.append(allCharacters.charAt(SECURE_RANDOM.nextInt(allCharacters.length())));
        }
        return password.toString();
    }
}
