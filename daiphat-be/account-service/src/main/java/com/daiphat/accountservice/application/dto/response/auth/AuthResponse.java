package com.daiphat.accountservice.application.dto.response.auth;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthResponse {
    @JsonView(Views.Public.class)
    @JsonProperty("access_token")
    String accessToken;
    
    @JsonView(Views.Public.class)
    @JsonProperty("expires_in")
    Long expiresIn;
    
    @JsonView(Views.Public.class)
    @JsonProperty("refresh_expires_in")
    Long refreshExpiresIn;
    
    @JsonView(Views.Public.class)
    @JsonProperty("token_type")
    String tokenType;
    
    @JsonView(Views.Public.class)
    @JsonProperty("scope")
    String scope;

    String refreshToken;

    @JsonView(Views.Public.class)
    UserResponse user;
}
