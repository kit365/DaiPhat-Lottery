package com.daiphat.coreapi.domain.model.enums.auth;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

/**
 * Danh sách các quyền (Permissions) cơ bản trong hệ thống.
 * Sử dụng cơ chế ghép Resource + Action để giữ code sạch sẽ (DRY).
 */
@Getter
@RequiredArgsConstructor
public enum AppPermission {
    // MODULE: HỆ THỐNG
    DASHBOARD_SYSTEM(PermissionConstants.DASHBOARD + PermissionConstants.SYSTEM, 
            "Tổng quan", "Xem Hệ thống", "Quyền truy cập giao diện biểu đồ Hệ thống", 1000),
    DASHBOARD_ANALYTICS(PermissionConstants.DASHBOARD + PermissionConstants.ANALYTICS, 
            "Tổng quan", "Xem Phân tích", "Quyền truy cập giao diện Phân tích số liệu", 999),
    DASHBOARD_ECOMMERCE(PermissionConstants.DASHBOARD + PermissionConstants.ECOMMERCE, 
            "Tổng quan", "Xem Bán hàng", "Quyền truy cập giao diện quản lý Bán hàng", 998),
    STATS_REVENUE(PermissionConstants.STATISTICS + ":revenue", 
            "Thống kê chi tiết", "Xem doanh thu thuần", "Quyền xem báo cáo doanh thu tài chính", 997),
    STATS_ORDER(PermissionConstants.STATISTICS + ":order", 
            "Thống kê chi tiết", "Xem đơn hàng", "Quyền xem báo cáo đơn hàng", 996),
    STATS_SERVICE(PermissionConstants.STATISTICS + ":service", 
            "Thống kê chi tiết", "Xem dịch vụ", "Quyền xem báo cáo dịch vụ", 995),
    
    // MODULE: TÀI KHOẢN QUẢN TRỊ (ADMINISTRATION)
    ADMIN_VIEW(PermissionConstants.ACCOUNT + PermissionConstants.VIEW, 
            "Quản trị", "Xem tài khoản", "Quyền xem danh sách nhân viên và quản lý", 910),
    ADMIN_CREATE(PermissionConstants.ACCOUNT + PermissionConstants.CREATE, 
            "Quản trị", "Tạo tài khoản", "Quyền tạo tài khoản quản trị/nhân viên mới", 909),
    ADMIN_EDIT(PermissionConstants.ACCOUNT + PermissionConstants.EDIT, 
            "Quản trị", "Sửa tài khoản", "Quyền cập nhật thông tin nhân viên quản trị", 908),
    ADMIN_DELETE(PermissionConstants.ACCOUNT + PermissionConstants.DELETE, 
            "Quản trị", "Xóa tài khoản", "Quyền gỡ bỏ tài khoản quản trị/nhân viên", 907),

    // MODULE: THÀNH VIÊN (MEMBERSHIP)
    MEMBER_VIEW(PermissionConstants.USER + PermissionConstants.VIEW, 
            "Thành viên", "Xem thành viên", "Quyền xem danh sách khách hàng/người chơi", 900),
    MEMBER_CREATE(PermissionConstants.USER + PermissionConstants.CREATE, 
            "Thành viên", "Tạo thành viên", "Quyền đăng ký tài khoản khách hàng mới", 899),
    MEMBER_EDIT(PermissionConstants.USER + PermissionConstants.EDIT, 
            "Thành viên", "Sửa thành viên", "Quyền cập nhật thông tin khách hàng", 898),
    MEMBER_DELETE(PermissionConstants.USER + PermissionConstants.DELETE, 
            "Thành viên", "Xóa thành viên", "Quyền xóa tài khoản khách hàng", 897),
    
    // MODULE: PHÂN QUYỀN (RBAC)
    ROLE_VIEW(PermissionConstants.ROLE + PermissionConstants.VIEW, 
            "Phân quyền", "Xem nhóm quyền", "Quyền xem danh sách các vai trò và quyền hạn", 850),
    ROLE_CREATE(PermissionConstants.ROLE + PermissionConstants.CREATE, 
            "Phân quyền", "Tạo nhóm quyền", "Quyền tạo thêm vai trò mới", 849),
    ROLE_EDIT(PermissionConstants.ROLE + PermissionConstants.EDIT, 
            "Phân quyền", "Sửa nhóm quyền", "Quyền cập nhật quyền hạn cho vai trò", 848),
    ROLE_DELETE(PermissionConstants.ROLE + PermissionConstants.DELETE, 
            "Phân quyền", "Xóa nhóm quyền", "Quyền xóa vai trò khỏi hệ thống", 847),

    // MODULE: NỘI DUNG
    ARTICLE_VIEW(PermissionConstants.ARTICLE + PermissionConstants.VIEW, 
            "Quản lý Nội dung", "Xem danh sách bài viết", "Quyền đọc nội dung các bài chuẩn bị xuất bản", 800),
    ARTICLE_CREATE(PermissionConstants.ARTICLE + PermissionConstants.CREATE, 
            "Quản lý Nội dung", "Tạo bài viết mới", "Quyền soạn thảo và lưu bản nháp bài viết", 790),
    ARTICLE_EDIT(PermissionConstants.ARTICLE + PermissionConstants.EDIT, 
            "Quản lý Nội dung", "Chỉnh sửa bài viết", "Quyền cập nhật nội dung bài viết đã có", 780),
    ARTICLE_DELETE(PermissionConstants.ARTICLE + PermissionConstants.DELETE, 
            "Quản lý Nội dung", "Xóa bài viết", "Quyền gỡ bỏ bài viết khỏi hệ thống", 770),

    // MODULE: VÉ SỐ
    TICKET_VIEW(PermissionConstants.TICKET + PermissionConstants.VIEW, 
            "Quản lý Vé số", "Xem danh sách vé số", "Quyền xem danh sách vé số trong kho", 700),
    TICKET_CREATE(PermissionConstants.TICKET + PermissionConstants.CREATE, 
            "Quản lý Vé số", "Tạo vé số mới", "Quyền thêm vé số mới vào hệ thống", 690),
    TICKET_EDIT(PermissionConstants.TICKET + PermissionConstants.EDIT, 
            "Quản lý Vé số", "Chỉnh sửa vé số", "Quyền cập nhật thông tin vé số", 680),
    TICKET_DELETE(PermissionConstants.TICKET + PermissionConstants.DELETE, 
            "Quản lý Vé số", "Xóa vé số", "Quyền xóa vé số khỏi kho", 670),

    PROVIDER_VIEW(PermissionConstants.PROVIDER + PermissionConstants.VIEW, 
            "Quản lý Vé số", "Xem nhà đài", "Quyền xem danh sách nhà đài", 660),
    PROVIDER_CREATE(PermissionConstants.PROVIDER + PermissionConstants.CREATE, 
            "Quản lý Vé số", "Tạo nhà đài", "Quyền thêm nhà đài mới", 650),
    PROVIDER_EDIT(PermissionConstants.PROVIDER + PermissionConstants.EDIT, 
            "Quản lý Vé số", "Sửa nhà đài", "Quyền cập nhật thông tin nhà đài", 640),

    // MODULE: TIỆN ÍCH & ĐƠN HÀNG
    TICKET_SERVICE_VIEW(PermissionConstants.TICKET_SERVICE + PermissionConstants.VIEW, 
            "Quản lý Tiện ích", "Xem tiện ích", "Quyền xem danh sách các dịch vụ tiện ích", 600),
    TICKET_SERVICE_CREATE(PermissionConstants.TICKET_SERVICE + PermissionConstants.CREATE, 
            "Quản lý Tiện ích", "Tạo tiện ích", "Quyền tạo dịch vụ tiện ích mới", 590),
    TICKET_SERVICE_EDIT(PermissionConstants.TICKET_SERVICE + PermissionConstants.EDIT, 
            "Quản lý Tiện ích", "Sửa tiện ích", "Quyền cập nhật dịch vụ tiện ích", 580),

    TICKET_SERVICE_ORDER_VIEW(PermissionConstants.TICKET_SERVICE_ORDER + PermissionConstants.VIEW, 
            "Đơn mua hộ & Tra vé", "Xem đơn hàng", "Quyền xem danh sách đơn hàng mua hộ", 550),
    TICKET_SERVICE_ORDER_EDIT(PermissionConstants.TICKET_SERVICE_ORDER + PermissionConstants.EDIT, 
            "Đơn mua hộ & Tra vé", "Sửa đơn hàng", "Quyền cập nhật trạng thái đơn hàng", 540),

    // MODULE: KHUYẾN MÃI
    COUPON_VIEW(PermissionConstants.COUPON + PermissionConstants.VIEW, 
            "Mã giảm giá & Khách hàng", "Xem mã giảm giá", "Quyền xem danh sách mã khuyến mãi", 500),
    COUPON_CREATE(PermissionConstants.COUPON + PermissionConstants.CREATE, 
            "Mã giảm giá & Khách hàng", "Tạo mã giảm giá", "Quyền tạo mã khuyến mãi mới", 490),
    COUPON_EDIT(PermissionConstants.COUPON + PermissionConstants.EDIT, 
            "Mã giảm giá & Khách hàng", "Sửa mã giảm giá", "Quyền cập nhật mã khuyến mãi", 480),

    // MODULE: HỖ TRỢ & CHAT
    CHAT_VIEW(PermissionConstants.CHAT + PermissionConstants.VIEW, 
            "Hỗ trợ & Chat", "Xem hỗ trợ trực tuyến", "Quyền truy cập vào giao diện chat hỗ trợ khách hàng", 400),
    CHAT_MANAGE(PermissionConstants.CHAT + PermissionConstants.MANAGE, 
            "Hỗ trợ & Chat", "Quản lý chat", "Quyền trả lời và quản lý các phiên hỗ trợ", 390),

    // MODULE: HỆ THỐNG KHÁC
    CALENDAR_VIEW(PermissionConstants.CALENDAR + PermissionConstants.VIEW, 
            "Hệ thống & Calendar", "Xem Calendar", "Quyền truy cập giao diện lịch", 200),
    SETTINGS_VIEW(PermissionConstants.SETTINGS + PermissionConstants.VIEW, 
            "Hệ thống & Calendar", "Xem cài đặt", "Quyền xem cấu hình hệ thống", 100),
    SETTINGS_EDIT(PermissionConstants.SETTINGS + PermissionConstants.EDIT, 
            "Hệ thống & Calendar", "Sửa cài đặt", "Quyền cập nhật cấu hình hệ thống", 90);

    private final String code;
    private final String module;
    private final String name;
    private final String description;
    private final Integer position;

    public static AppPermission fromCode(String code) {
        return Arrays.stream(values())
                .filter(p -> p.getCode().equals(code))
                .findFirst()
                .orElse(null);
    }
}
