package com.daiphat.coreapi.application.port.in.user;

import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.coreapi.application.dto.request.user.UpdateUserRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.application.dto.response.user.UserStatusResponse;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.List;
import java.util.UUID;

public interface UserServicePort {
    UserResponse create(CreateUserRequest request);
    UserResponse createInternalStreetAgent(CreateUserRequest request);
    void update(UUID id, UpdateUserRequest request);
    UserResponse getById(UUID id);
    UserResponse getByUsername(String username);
    UserResponse getMyProfile(String username);
    List<UserStatusResponse> getStatuses();
    List<UserResponse> getAll();
    List<UserResponse> searchCustomers(String query, int limit);
    PageResponse<UserResponse> getAll(int page, int size, String search, String status, List<String> roleIds, String sortBy, String direction);
    void delete(UUID id);
    void setupFirstTimeProfile(String username, ProfileSetupRequest request);
    UserResponse uploadAvatar(UUID id, UploadRequest request);
    UserResponse deleteAvatar(UUID id);
    void updateFcmToken(UUID userId, String fcmToken);
}
