package com.daiphat.coreapi.domain.model.enums.blog;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Trạng thái kiểm duyệt và xuất bản của bài viết.
 */
@Getter
@RequiredArgsConstructor
public enum PostStatus {
    DRAFT("draft", "Bản nháp"),
    PUBLISHED("published", "Đã đăng công khai"),
    UNPUBLISHED("unpublished", "Đã gỡ xuống"),
    SCHEDULED("scheduled", "Hẹn giờ đăng");

    private final String code;
    private final String label;

    public static PostStatus fromCode(String code) {
        for (PostStatus status : PostStatus.values()) {
            if (status.getCode().equalsIgnoreCase(code)) {
                return status;
            }
        }
        throw new com.daiphat.coreapi.domain.exception.DomainException(
            com.daiphat.coreapi.domain.exception.ErrorCode.INVALID_INPUT,
            "Trạng thái bài viết không hợp lệ: " + code
        );
    }
}
