package com.daiphat.accountservice.application.dto.identity;

import com.daiphat.accountservice.domain.model.UserModel;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class KeycloakUserDTO {
    private String id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private Boolean enabled;
    private Boolean emailVerified;
    private Map<String, List<String>> attributes;
    private List<KeycloakCredentialDTO> credentials;

    public static KeycloakUserDTO fromModel(UserModel user) {
        return fromModel(user, null, false);
    }

    public static KeycloakUserDTO fromModel(UserModel user, String password, boolean temporary) {
        KeycloakUserDTO.KeycloakUserDTOBuilder builder = KeycloakUserDTO.builder()
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .enabled(true)
                .emailVerified(user.isEmailVerified());

        if (password != null) {
            builder.credentials(List.of(KeycloakCredentialDTO.password(password, temporary)));
        }

        return builder.build();
    }
}
