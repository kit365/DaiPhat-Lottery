package com.daiphat.accountservice.domain.model.auth;

import lombok.*;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KeycloakAuthResult {
    private String keycloakUserId;
    private String username;
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private long refreshExpiresIn;
    private String tokenType;
    private String scope;
}
