package com.daiphat.accountservice.domain.model.enums;

/**
 * Hằng số mã vai trò (Role Codes) trong hệ thống.
 * Đồng bộ với Database Seeding.
 */
public final class RoleConstants {
    private RoleConstants() {
    }

    public static final String ADMIN = "ROLE_ADMIN";
    public static final String ROLE_MEMBER = "ROLE_MEMBER";
    public static final String ROLE_STAFF_SHIPPER = "ROLE_STAFF_SHIPPER";
    public static final String ROLE_STAFF_MANAGER = "ROLE_STAFF_MANAGER";
}
