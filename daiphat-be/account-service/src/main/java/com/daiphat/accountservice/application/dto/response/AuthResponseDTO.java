package com.daiphat.accountservice.application.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthResponseDTO {
    @JsonProperty("access_token")
    String accessToken;
    
    @JsonProperty("expires_in")
    Long expiresIn;
    
    @JsonIgnore
    @JsonProperty("refresh_token")
    String refreshToken;
    
    @JsonProperty("refresh_expires_in")
    Long refreshExpiresIn;
    
    @JsonProperty("token_type")
    String tokenType;
    
    @JsonProperty("scope")
    String scope;

    UserAuthMeResponseDTO user;
}
