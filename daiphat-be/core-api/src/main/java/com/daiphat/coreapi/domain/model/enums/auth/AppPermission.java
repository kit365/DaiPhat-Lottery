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
            "Quản lý nhân viên", "Xem nhân viên", "Quyền xem danh sách tài khoản nhân viên và quản trị", 910),
    ADMIN_CREATE(PermissionConstants.ACCOUNT + PermissionConstants.CREATE, 
            "Quản lý nhân viên", "Tạo nhân viên", "Quyền tạo tài khoản nhân viên hoặc quản trị mới", 909),
    ADMIN_EDIT(PermissionConstants.ACCOUNT + PermissionConstants.EDIT, 
            "Quản lý nhân viên", "Sửa nhân viên", "Quyền cập nhật thông tin tài khoản nhân viên và quản trị", 908),
    ADMIN_DELETE(PermissionConstants.ACCOUNT + PermissionConstants.DELETE, 
            "Quản lý nhân viên", "Xóa nhân viên", "Quyền gỡ bỏ tài khoản nhân viên hoặc quản trị", 907),

    // MODULE: THÀNH VIÊN (MEMBERSHIP)
    MEMBER_VIEW(PermissionConstants.USER + PermissionConstants.VIEW, 
            "Quản lý khách hàng", "Xem khách hàng", "Quyền xem danh sách khách hàng/người chơi", 900),
    MEMBER_CREATE(PermissionConstants.USER + PermissionConstants.CREATE, 
            "Quản lý khách hàng", "Tạo khách hàng", "Quyền tạo tài khoản khách hàng mới", 899),
    MEMBER_EDIT(PermissionConstants.USER + PermissionConstants.EDIT, 
            "Quản lý khách hàng", "Sửa khách hàng", "Quyền cập nhật thông tin khách hàng", 898),
    MEMBER_DELETE(PermissionConstants.USER + PermissionConstants.DELETE, 
            "Quản lý khách hàng", "Xóa khách hàng", "Quyền xóa tài khoản khách hàng", 897),
    
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

    IMPORT_BATCH_VIEW(PermissionConstants.IMPORT_BATCH + PermissionConstants.VIEW,
            "Quản lý Nhập lô vé", "Xem phiếu nhập lô", "Quyền xem danh sách phiếu nhập lô vé", 695),
    IMPORT_BATCH_CREATE(PermissionConstants.IMPORT_BATCH + PermissionConstants.CREATE,
            "Quản lý Nhập lô vé", "Tạo phiếu nhập lô", "Quyền khai báo phiếu nhập lô vé mới", 692),

    SUPPLIER_VIEW(PermissionConstants.SUPPLIER + PermissionConstants.VIEW,
            "Quản lý Nhà cung cấp", "Xem nhà cung cấp", "Quyền xem danh sách nhà cung cấp", 698),
    SUPPLIER_CREATE(PermissionConstants.SUPPLIER + PermissionConstants.CREATE,
            "Quản lý Nhà cung cấp", "Tạo nhà cung cấp", "Quyền thêm nhà cung cấp mới", 697),
    SUPPLIER_EDIT(PermissionConstants.SUPPLIER + PermissionConstants.EDIT,
            "Quản lý Nhà cung cấp", "Sửa nhà cung cấp", "Quyền cập nhật thông tin nhà cung cấp", 696),

    STATION_VIEW(PermissionConstants.STATION + PermissionConstants.VIEW,
            "Quản lý Nhà đài", "Xem nhà đài", "Quyền xem danh sách nhà đài", 665),
    STATION_CREATE(PermissionConstants.STATION + PermissionConstants.CREATE,
            "Quản lý Nhà đài", "Tạo nhà đài", "Quyền thêm nhà đài mới", 655),
    STATION_EDIT(PermissionConstants.STATION + PermissionConstants.EDIT,
            "Quản lý Nhà đài", "Sửa nhà đài", "Quyền cập nhật thông tin nhà đài", 645),
    STATION_SYNC(PermissionConstants.STATION + PermissionConstants.SYNC,
            "Quản lý Nhà đài", "Đồng bộ nhà đài", "Quyền đồng bộ dữ liệu nhà đài từ nguồn ngoài", 640),
    STATION_DELETE(PermissionConstants.STATION + PermissionConstants.DELETE,
            "Quản lý Nhà đài", "Xóa nhà đài", "Quyền xóa nhà đài", 635),

    REGION_VIEW(PermissionConstants.REGION + PermissionConstants.VIEW,
            "Quản lý Miền quay", "Xem miền quay", "Quyền xem cấu hình miền quay", 625),
    REGION_EDIT(PermissionConstants.REGION + PermissionConstants.EDIT,
            "Quản lý Miền quay", "Sửa miền quay", "Quyền cập nhật cấu hình miền quay", 615),

    STREET_AGENT_VIEW(PermissionConstants.STREET_AGENT + PermissionConstants.VIEW,
            "Quản lý Người bán vé số dạo", "Xem hồ sơ người bán vé số dạo", "Quyền xem danh sách người bán vé số dạo", 610),
    STREET_AGENT_CREATE(PermissionConstants.STREET_AGENT + PermissionConstants.CREATE,
            "Quản lý Người bán vé số dạo", "Tạo hồ sơ người bán vé số dạo", "Quyền tạo hồ sơ người bán vé số dạo", 605),
    STREET_AGENT_EDIT(PermissionConstants.STREET_AGENT + PermissionConstants.EDIT,
            "Quản lý Người bán vé số dạo", "Sửa hồ sơ người bán vé số dạo", "Quyền cập nhật hồ sơ người bán vé số dạo", 603),
    STREET_AGENT_DELETE(PermissionConstants.STREET_AGENT + PermissionConstants.DELETE,
            "Quản lý Người bán vé số dạo", "Xóa hồ sơ người bán vé số dạo", "Quyền xóa hồ sơ người bán vé số dạo", 601),

    PRIZE_STRUCTURE_VIEW(PermissionConstants.PRIZE_STRUCTURE + PermissionConstants.VIEW,
            "Quản lý Cơ cấu giải", "Xem cơ cấu giải", "Quyền xem danh sách cơ cấu giải theo miền", 599),
    PRIZE_STRUCTURE_CREATE(PermissionConstants.PRIZE_STRUCTURE + PermissionConstants.CREATE,
            "Quản lý Cơ cấu giải", "Tạo cơ cấu giải", "Quyền tạo cơ cấu giải mới", 597),
    PRIZE_STRUCTURE_EDIT(PermissionConstants.PRIZE_STRUCTURE + PermissionConstants.EDIT,
            "Quản lý Cơ cấu giải", "Sửa cơ cấu giải", "Quyền cập nhật cơ cấu giải", 595),
    PRIZE_STRUCTURE_DELETE(PermissionConstants.PRIZE_STRUCTURE + PermissionConstants.DELETE,
            "Quản lý Cơ cấu giải", "Xóa cơ cấu giải", "Quyền xóa cơ cấu giải", 593),
    PRIZE_STRUCTURE_SYNC(PermissionConstants.PRIZE_STRUCTURE + PermissionConstants.SYNC,
            "Quản lý Cơ cấu giải", "Đồng bộ cơ cấu giải", "Quyền đồng bộ cơ cấu giải từ nguồn ngoài", 591),

    LOTTERY_RESULT_VIEW(PermissionConstants.LOTTERY_RESULT + PermissionConstants.VIEW,
            "Quản lý Kết quả xổ số", "Xem kết quả xổ số", "Quyền xem danh sách kết quả xổ số", 589),
    LOTTERY_RESULT_CREATE(PermissionConstants.LOTTERY_RESULT + PermissionConstants.CREATE,
            "Quản lý Kết quả xổ số", "Tạo kết quả xổ số", "Quyền tạo kết quả xổ số thủ công", 587),
    LOTTERY_RESULT_EDIT(PermissionConstants.LOTTERY_RESULT + PermissionConstants.EDIT,
            "Quản lý Kết quả xổ số", "Sửa kết quả xổ số", "Quyền cập nhật kết quả xổ số", 585),
    LOTTERY_RESULT_DELETE(PermissionConstants.LOTTERY_RESULT + PermissionConstants.DELETE,
            "Quản lý Kết quả xổ số", "Xóa kết quả xổ số", "Quyền xóa kết quả xổ số", 583),
    LOTTERY_RESULT_SYNC(PermissionConstants.LOTTERY_RESULT + PermissionConstants.SYNC,
            "Quản lý Kết quả xổ số", "Đồng bộ kết quả xổ số", "Quyền đồng bộ hoặc đồng bộ lại kết quả xổ số", 581),

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

    ORDER_VIEW(PermissionConstants.ORDER + PermissionConstants.VIEW,
            "Đơn mua hộ & Tra vé", "Xem đơn hàng", "Quyền xem danh sách đơn hàng mua hộ", 560),
    ORDER_CREATE(PermissionConstants.ORDER + PermissionConstants.CREATE,
            "Đơn mua hộ & Tra vé", "Tạo đơn hàng", "Quyền tạo đơn hàng online hoặc tại quầy", 555),
    ORDER_EDIT(PermissionConstants.ORDER + PermissionConstants.EDIT,
            "Đơn mua hộ & Tra vé", "Sửa đơn hàng", "Quyền cập nhật trạng thái và thanh toán đơn hàng", 545),
    ORDER_DELETE(PermissionConstants.ORDER + PermissionConstants.DELETE,
            "Đơn mua hộ & Tra vé", "Xóa đơn hàng", "Quyền hủy hoặc xóa đơn hàng", 535),

    TICKET_SERVICE_ORDER_VIEW(PermissionConstants.TICKET_SERVICE_ORDER + PermissionConstants.VIEW, 
            "Đơn mua hộ & Tra vé", "Xem đơn mua hộ tiện ích", "Quyền xem danh sách đơn mua hộ tiện ích", 550),
    TICKET_SERVICE_ORDER_EDIT(PermissionConstants.TICKET_SERVICE_ORDER + PermissionConstants.EDIT, 
            "Đơn mua hộ & Tra vé", "Sửa đơn mua hộ tiện ích", "Quyền cập nhật trạng thái đơn mua hộ tiện ích", 540),

    REFUND_VIEW(PermissionConstants.REFUND + PermissionConstants.VIEW,
            "Đơn mua hộ & Hoàn tiền", "Xem yêu cầu hoàn tiền", "Quyền xem danh sách và chi tiết yêu cầu hoàn tiền", 530),
    REFUND_APPROVE(PermissionConstants.REFUND + PermissionConstants.APPROVE,
            "Đơn mua hộ & Hoàn tiền", "Duyệt yêu cầu hoàn tiền", "Quyền duyệt yêu cầu hủy đơn đang chờ", 525),
    REFUND_REJECT(PermissionConstants.REFUND + PermissionConstants.REJECT,
            "Đơn mua hộ & Hoàn tiền", "Từ chối yêu cầu hoàn tiền", "Quyền từ chối yêu cầu hủy đơn đang chờ", 520),
    REFUND_PROCESS(PermissionConstants.REFUND + PermissionConstants.PROCESS,
            "Đơn mua hộ & Hoàn tiền", "Xử lý chuyển khoản hoàn tiền", "Quyền xác nhận đã chuyển khoản hoàn tiền", 515),

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
