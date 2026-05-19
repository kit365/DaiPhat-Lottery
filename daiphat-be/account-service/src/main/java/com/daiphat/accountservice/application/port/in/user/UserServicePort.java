package com.daiphat.accountservice.application.port.in.user;
import com.daiphat.accountservice.application.dto.request.user.CreateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.UpdateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.accountservice.application.dto.request.InviteStaffRequest;
import com.daiphat.accountservice.application.dto.request.AcceptInviteRequest;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.application.dto.response.base.PageResponse;
import com.daiphat.accountservice.domain.model.UserModel;

import java.util.List;
import java.util.UUID;

public interface UserServicePort {
    void create(CreateUserRequest request);

    void update(UUID id, UpdateUserRequest request);

    UserResponse getById(UUID id);

    UserResponse getByUsername(String username);

    UserResponse getMyProfile(String username);

    List<UserResponse> getAll();

    PageResponse<UserResponse> getAll(
            int page, int size, String search, String status, List<String> roleIds, String sortBy,
            String direction);

    void delete(UUID id);

    void inviteStaff(String id, InviteStaffRequest request);

    void acceptInvite(AcceptInviteRequest request);


    void setupFirstTimeProfile(String username, ProfileSetupRequest request);
}
