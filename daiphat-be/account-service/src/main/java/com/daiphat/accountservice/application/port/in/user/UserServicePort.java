package com.daiphat.accountservice.application.port.in.user;

import com.daiphat.accountservice.application.dto.request.user.CreateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.domain.model.UserModel;

import java.util.List;
import java.util.UUID;

public interface UserServicePort {
    UserResponse create(CreateUserRequest request);

    UserResponse getById(UUID id);

    UserResponse getByUsername(String username);

    UserResponse getMyProfile(String username);

    List<UserResponse> getAll();

    com.daiphat.accountservice.application.dto.response.base.PageResponse<UserResponse> getAll(
            int page, int size, String search, String status, java.util.List<String> roleIds, String sortBy,
            String direction);

    void delete(UUID id);

    // Internal Use
    UserModel fetchActiveUserByUsername(String username);

    UserModel fetchActiveUserById(UUID id);

    UUID getIdByUsername(String username);

    void setupFirstTimeProfile(String username, ProfileSetupRequest request);

    void changePassword(UUID id, String newPassword);

    void initiatePasswordReset(UUID id);

    void confirmPasswordReset(UUID id, String otp, String phoneNumber);
}
