package com.daiphat.accountservice.application.dto.identity;

import com.daiphat.accountservice.infrastructure.adapter.auth.KeycloakConstants;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class KeycloakCredentialDTO {
    private String type;
    private String value;
    private Boolean temporary;

    public static KeycloakCredentialDTO password(String password, boolean temporary) {
        return KeycloakCredentialDTO.builder()
                .type(KeycloakConstants.CREDENTIAL_TYPE_PASSWORD)
                .value(password)
                .temporary(temporary)
                .build();
    }
}
