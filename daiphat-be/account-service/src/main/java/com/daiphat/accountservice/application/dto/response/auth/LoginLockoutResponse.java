package com.daiphat.accountservice.application.dto.response.auth;

import com.daiphat.accountservice.application.dto.response.base.SafeResponseData;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginLockoutResponse implements SafeResponseData {
    private long remainingSeconds;
}
