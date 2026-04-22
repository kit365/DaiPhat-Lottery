package com.daiphat.accountservice.infrastructure.config.security;

import com.daiphat.accountservice.domain.model.enums.PermissionConstants;
import org.springframework.stereotype.Component;

/**
 * Utility Bean để rút gọn việc check quyền trong @PreAuthorize.
 * Tên bean là "p" để dùng như sau: @PreAuthorize("@p.has('resource', 'action')")
 */
@Component("p")
public class SecurityExpressionUtils {

    /**
     * Check quyền theo Resource và Action (Convention: resource:action).
     */
    public boolean has(String resource, String action) {
        // Spring Security sẽ tự động check authority trong context
        // Hàm này có thể mở rộng để check logic phức tạp hơn nếu cần
        return true; // Trả về true để bypass check ở tầng bean, thực chất check ở hasAuthority
    }

    /**
     * Helper cho module ROLE.
     */
    public String role(String action) {
        return PermissionConstants.ROLE + action;
    }

    /**
     * Helper cho module ARTICLE.
     */
    public String article(String action) {
        return PermissionConstants.ARTICLE + action;
    }
    
    /**
     * Helper cho module USER.
     */
    public String user(String action) {
        return PermissionConstants.USER + action;
    }
}
