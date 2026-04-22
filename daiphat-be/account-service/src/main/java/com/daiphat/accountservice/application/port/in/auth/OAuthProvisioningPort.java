package com.daiphat.accountservice.application.port.in.auth;

import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.OAuthUserInfo;

/**
 * Port for JIT (Just-In-Time) provisioning and synchronization of OAuth users.
 * Supports multiple providers through specialized strategy implementations.
 */
public interface OAuthProvisioningPort {
    /**
     * Provision a user from external OAuth context.
     * Extracts identity, resolves roles, and persists the local account mirror.
     */
    UserModel provision(OAuthUserInfo userInfo);
}
