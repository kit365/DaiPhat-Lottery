package com.daiphat.coreapi.application.port.out.auth;

import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.domain.model.auth.OAuthUserInfo;

public interface GoogleOAuthPort {
    OAuthUserInfo verify(GoogleLoginRequest request);
}
