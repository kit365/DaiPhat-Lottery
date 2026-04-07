package com.daiphat.accountservice.application.port.in;

import com.daiphat.accountservice.application.dto.response.UserResponseDTO;

import java.util.List;
import java.util.UUID;

public interface UserServicePort {
    UserResponseDTO getById(UUID id);
    UserResponseDTO getByUsername(String username);
    List<UserResponseDTO> getAll();
    void delete(UUID id);
}
