package com.daiphat.coreapi.application.dto.response.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordPolicyResponse {
    private List<PasswordRequirementResponse> requirements;
    private int minLength;
    private int maxLength;
}
