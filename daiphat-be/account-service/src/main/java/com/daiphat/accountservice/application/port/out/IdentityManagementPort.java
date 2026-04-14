package com.daiphat.accountservice.application.port.out;

import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IdentityManagementPort {
    List<UserModel> getAllUsers();
    Optional<UserModel> getUserByUsername(String username);
    UUID createUser(UserModel user, String password);
    void assignRole(UUID userId, String roleCode);
    void resetPassword(UUID userId, String newPassword);
    void deleteUser(UUID userId);
    void verifyEmail(UUID userId);
    KeycloakAuthResult authenticate(String username, String password);
    void logout(String refreshToken);
    KeycloakAuthResult refreshToken(String refreshToken);
    KeycloakAuthResult issueToken(String username);
    UUID getUserIdFromToken(String token);
}
