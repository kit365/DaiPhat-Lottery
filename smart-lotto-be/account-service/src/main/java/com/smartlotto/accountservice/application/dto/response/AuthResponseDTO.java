package com.smartlotto.accountservice.application.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    
    @JsonProperty("refresh_token")
    String refreshToken;
    
    @JsonProperty("refresh_expires_in")
    Long refreshExpiresIn;
    
    @JsonProperty("token_type")
    String tokenType;
    
    @JsonProperty("scope")
    String scope;
}
