package com.smartlotto.apigatewayservice.config;

import java.util.List;

public final class CorsConstants {

    private CorsConstants() {
    }

    public static final List<String> ALLOWED_ORIGINS = List.of(
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://192.168.2.44:8080",
        "http://192.168.2.44:8081");

    public static final List<String> ALLOWED_METHODS = List.of(
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS");
}
