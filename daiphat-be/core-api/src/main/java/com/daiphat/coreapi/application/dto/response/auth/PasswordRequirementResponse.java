package com.daiphat.coreapi.application.dto.response.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordRequirementResponse {
    private String id;
    private String description;
    private String regex;
}
