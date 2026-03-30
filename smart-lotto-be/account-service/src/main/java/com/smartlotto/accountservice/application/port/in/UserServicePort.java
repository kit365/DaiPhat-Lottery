package com.smartlotto.accountservice.application.port.in;

import com.smartlotto.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.smartlotto.accountservice.application.dto.response.UserResponseDTO;

import java.util.List;
import java.util.UUID;

public interface UserServicePort {
    UserResponseDTO register(UserRegistrationRequestDTO request);
    UserResponseDTO getById(UUID id);
    UserResponseDTO getByUsername(String username);
    List<UserResponseDTO> getAll();
    void delete(UUID id);
}
