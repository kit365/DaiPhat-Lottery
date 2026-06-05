package com.daiphat.coreapi.domain.model.enums.blog;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Loại bài viết trong hệ thống blog/tin tức.
 */
@Getter
@RequiredArgsConstructor
public enum PostType {
    BLOG("blog", "Bài viết blog"),
    NEWS("news", "Tin tức"),
    TIP("tip", "Mẹo chơi xổ số");

    private final String code;
    private final String label;

    public static PostType fromCode(String code) {
        for (PostType type : PostType.values()) {
            if (type.getCode().equalsIgnoreCase(code)) {
                return type;
            }
        }
        throw new DomainException(
            ErrorCode.INVALID_INPUT,
            "Loại bài viết không hợp lệ: " + code
        );
    }
}
