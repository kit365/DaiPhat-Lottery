package com.daiphat.coreapi.domain.model.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Dữ liệu tạm thời lưu trữ trong Cache phục vụ quá trình chấp nhận lời mời tham gia (Invite).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteData implements Serializable {
    private UUID userId;
    private String role;

    public UUID userId() {
        return this.userId;
    }

    public String role() {
        return this.role;
    }
}
