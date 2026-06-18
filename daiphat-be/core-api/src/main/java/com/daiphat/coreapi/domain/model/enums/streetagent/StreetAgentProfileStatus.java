package com.daiphat.coreapi.domain.model.enums.streetagent;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.CodedLabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StreetAgentProfileStatus implements CodedLabeledEnum {
    ACTIVE("ACTIVE", "Hoạt động"),
    INACTIVE("INACTIVE", "Ngưng hoạt động"),
    PENDING("PENDING", "Chờ xử lý");

    private final String code;
    private final String label;

    public static StreetAgentProfileStatus fromCode(String code) {
        if (code == null || code.isBlank()) {
            return ACTIVE;
        }
        for (StreetAgentProfileStatus status : values()) {
            if (status.code.equalsIgnoreCase(code.trim())) {
                return status;
            }
        }
        throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_INVALID_STATUS);
    }
}
