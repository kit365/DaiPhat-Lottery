package com.daiphat.accountservice.application.port.out;

import com.daiphat.accountservice.domain.model.UserModel;

import java.util.List;
import java.util.UUID;

public interface IdentityManagementPort {
    /**
     * Retrieves all users from the identity provider.
     * @return A list of user models.
     */
    List<UserModel> getAllUsers();

    /**
     * Creates a new user in the identity provider.
     * @param user The user model containing username, email, etc.
     * @param password The user's password.
     * @return The unique identifier (sub) from the identity provider.
     */
    UUID createUser(UserModel user, String password);

    /**
     * Assigns a role to the user in the identity provider.
     * @param userId The unique identifier of the user.
     * @param roleCode The code of the role (e.g., ROLE_USER, ROLE_ADMIN).
     */
    void assignRole(UUID userId, String roleCode);

    /**
     * Resets or sets the user's password in the identity provider.
     * @param userId The unique identifier of the user.
     * @param newPassword The new password.
     */
    void resetPassword(UUID userId, String newPassword);

    /**
     * Deletes a user from the identity provider.
     * @param userId The unique identifier of the user.
     */
    void deleteUser(UUID userId);
}
