package com.daiphat.accountservice.application.port.in;

import com.daiphat.accountservice.application.dto.response.UserAuthMeResponseDTO;
import com.daiphat.accountservice.application.dto.response.UserResponseDTO;
import com.daiphat.accountservice.domain.model.UserModel;

import java.util.List;
import java.util.UUID;

public interface UserServicePort {
    UserResponseDTO getById(UUID id);
    UserResponseDTO getByUsername(String username);
    UserAuthMeResponseDTO getMyProfile(String username);
    List<UserResponseDTO> getAll();
    void delete(UUID id);

    // Internal Use
    UserModel fetchActiveUserByUsername(String username);
    UserModel fetchActiveUserById(UUID id);
    UUID getIdByUsername(String username);
}
