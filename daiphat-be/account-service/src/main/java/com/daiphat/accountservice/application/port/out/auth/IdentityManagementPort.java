package com.daiphat.accountservice.application.port.out.auth;

import com.daiphat.accountservice.application.dto.identity.KeycloakRoleDTO;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IdentityManagementPort {
    List<UserModel> getAllUsers();

    Optional<UserModel> getUserByUsername(String username);

    UUID createUser(UserModel user, String password, boolean temporary);

    void assignRole(UUID userId, String roleCode);
    void assignRole(UUID userId, List<String> roleCodes);

    void resetPassword(UUID userId, String newPassword, boolean temporary);

    void logoutUserSessions(UUID userId);

    void deleteUser(UUID userId);

    void verifyEmail(UUID userId);

    List<KeycloakRoleDTO> getAllRoles();

    void createRole(String name, String description);

    void deleteRole(String name);

    KeycloakAuthResult authenticate(String username, String password);

    void logout(String refreshToken);

    KeycloakAuthResult refreshToken(String refreshToken);

    KeycloakAuthResult issueToken(String username);

    UUID getUserIdFromToken(String token);
}
