import { PERMISSIONS } from "./permission.constants";

export const PERMISSIONS_GROUPED = [
    {
        module: "Tổng quan",
        permissions: [
            { id: PERMISSIONS.DASHBOARD.SYSTEM, name: "Xem dashboard hệ thống" },
            { id: PERMISSIONS.DASHBOARD.ANALYTICS, name: "Xem dashboard phân tích" },
            { id: PERMISSIONS.DASHBOARD.ECOMMERCE, name: "Xem dashboard bán hàng" },
            { id: PERMISSIONS.STATISTICS.REVENUE, name: "Xem thống kê doanh thu" },
            { id: PERMISSIONS.STATISTICS.ORDER, name: "Xem thống kê đơn hàng" },
            { id: PERMISSIONS.STATISTICS.SERVICE, name: "Xem thống kê dịch vụ" },
        ]
    },
    {
        module: "Quản lý bài viết",
        permissions: [
            { id: PERMISSIONS.ARTICLE.VIEW, name: "Xem bài viết" },
            { id: PERMISSIONS.ARTICLE.CREATE, name: "Tạo bài viết" },
            { id: PERMISSIONS.ARTICLE.EDIT, name: "Sửa bài viết" },
            { id: PERMISSIONS.ARTICLE.DELETE, name: "Xóa bài viết" },
        ]
    },
    {
        module: "Quản lý vé số",
        permissions: [
            { id: PERMISSIONS.TICKET.VIEW, name: "Xem vé số" },
            { id: PERMISSIONS.TICKET.CREATE, name: "Tạo vé số" },
            { id: PERMISSIONS.TICKET.EDIT, name: "Sửa vé số" },
            { id: PERMISSIONS.TICKET.DELETE, name: "Xóa vé số" },
        ]
    },
    {
        module: "Quản lý nhà đài",
        permissions: [
            { id: PERMISSIONS.PROVIDER.VIEW, name: "Xem nhà đài" },
            { id: PERMISSIONS.PROVIDER.CREATE, name: "Tạo nhà đài" },
            { id: PERMISSIONS.PROVIDER.EDIT, name: "Sửa nhà đài" },
            { id: PERMISSIONS.PROVIDER.DELETE, name: "Xóa nhà đài" },
            { id: PERMISSIONS.PROVIDER.SYNC, name: "Đồng bộ nhà đài" },
        ]
    },
    {
        module: "Quản lý nhà cung cấp",
        permissions: [
            { id: PERMISSIONS.SUPPLIER.VIEW, name: "Xem nhà cung cấp" },
            { id: PERMISSIONS.SUPPLIER.CREATE, name: "Tạo nhà cung cấp" },
            { id: PERMISSIONS.SUPPLIER.EDIT, name: "Sửa nhà cung cấp" },
        ]
    },
    {
        module: "Quản lý nhập lô vé",
        permissions: [
            { id: PERMISSIONS.IMPORT_BATCH.VIEW, name: "Xem phiếu nhập lô" },
            { id: PERMISSIONS.IMPORT_BATCH.CREATE, name: "Tạo phiếu nhập lô" },
        ]
    },
    {
        module: "Quản lý miền quay",
        permissions: [
            { id: PERMISSIONS.REGION.VIEW, name: "Xem miền quay" },
            { id: PERMISSIONS.REGION.CREATE, name: "Tạo miền quay" },
            { id: PERMISSIONS.REGION.EDIT, name: "Sửa miền quay" },
            { id: PERMISSIONS.REGION.DELETE, name: "Xóa miền quay" },
            { id: PERMISSIONS.REGION.SYNC, name: "Đồng bộ miền quay" },
        ]
    },
    {
        module: "Quản lý cơ cấu giải",
        permissions: [
            { id: PERMISSIONS.PRIZE_STRUCTURE.VIEW, name: "Xem cơ cấu giải" },
            { id: PERMISSIONS.PRIZE_STRUCTURE.CREATE, name: "Tạo cơ cấu giải" },
            { id: PERMISSIONS.PRIZE_STRUCTURE.EDIT, name: "Sửa cơ cấu giải" },
            { id: PERMISSIONS.PRIZE_STRUCTURE.DELETE, name: "Xóa cơ cấu giải" },
            { id: PERMISSIONS.PRIZE_STRUCTURE.SYNC, name: "Đồng bộ cơ cấu giải" },
        ]
    },
    {
        module: "Quản lý kết quả xổ số",
        permissions: [
            { id: PERMISSIONS.LOTTERY_RESULT.VIEW, name: "Xem kết quả xổ số" },
            { id: PERMISSIONS.LOTTERY_RESULT.CREATE, name: "Tạo kết quả xổ số" },
            { id: PERMISSIONS.LOTTERY_RESULT.EDIT, name: "Sửa kết quả xổ số" },
            { id: PERMISSIONS.LOTTERY_RESULT.DELETE, name: "Xóa kết quả xổ số" },
            { id: PERMISSIONS.LOTTERY_RESULT.SYNC, name: "Đồng bộ kết quả xổ số" },
        ]
    },
    {
        module: "Quản lý tiện ích",
        permissions: [
            { id: PERMISSIONS.TICKET_SERVICE.VIEW, name: "Xem tiện ích" },
            { id: PERMISSIONS.TICKET_SERVICE.CREATE, name: "Tạo tiện ích" },
            { id: PERMISSIONS.TICKET_SERVICE.EDIT, name: "Sửa tiện ích" },
        ]
    },
    {
        module: "Đơn mua hộ & tra vé",
        permissions: [
            { id: PERMISSIONS.TICKET_SERVICE_ORDER.VIEW, name: "Xem đơn mua hộ" },
            { id: PERMISSIONS.TICKET_SERVICE_ORDER.EDIT, name: "Sửa đơn mua hộ" },
        ]
    },
    {
        module: "Quản lý đơn hàng",
        permissions: [
            { id: PERMISSIONS.ORDER.VIEW, name: "Xem đơn hàng" },
            { id: PERMISSIONS.ORDER.CREATE, name: "Tạo đơn hàng" },
            { id: PERMISSIONS.ORDER.EDIT, name: "Sửa đơn hàng" },
            { id: PERMISSIONS.ORDER.DELETE, name: "Xóa đơn hàng" },
        ]
    },
    {
        module: "Quản lý khách hàng",
        permissions: [
            { id: PERMISSIONS.USER.VIEW, name: "Xem khách hàng" },
            { id: PERMISSIONS.USER.CREATE, name: "Tạo khách hàng" },
            { id: PERMISSIONS.USER.EDIT, name: "Sửa khách hàng" },
            { id: PERMISSIONS.USER.DELETE, name: "Xóa khách hàng" },
        ]
    },
    {
        module: "Quản lý nhân viên",
        permissions: [
            { id: PERMISSIONS.ACCOUNT.VIEW, name: "Xem nhân viên" },
            { id: PERMISSIONS.ACCOUNT.CREATE, name: "Tạo nhân viên" },
            { id: PERMISSIONS.ACCOUNT.EDIT, name: "Sửa nhân viên" },
            { id: PERMISSIONS.ACCOUNT.DELETE, name: "Xóa nhân viên" },
        ]
    },
    {
        module: "Quản lý người bán vé số dạo",
        permissions: [
            { id: PERMISSIONS.STREET_AGENT.VIEW, name: "Xem người bán vé số dạo" },
            { id: PERMISSIONS.STREET_AGENT.CREATE, name: "Tạo người bán vé số dạo" },
            { id: PERMISSIONS.STREET_AGENT.EDIT, name: "Sửa người bán vé số dạo" },
            { id: PERMISSIONS.STREET_AGENT.DELETE, name: "Xóa người bán vé số dạo" },
        ]
    },
    {
        module: "Nhóm quyền",
        permissions: [
            { id: PERMISSIONS.ROLE.VIEW, name: "Xem nhóm quyền" },
            { id: PERMISSIONS.ROLE.CREATE, name: "Tạo nhóm quyền" },
            { id: PERMISSIONS.ROLE.EDIT, name: "Sửa nhóm quyền" },
            { id: PERMISSIONS.ROLE.DELETE, name: "Xóa nhóm quyền" },
        ]
    },
    {
        module: "Khác",
        permissions: [
            { id: PERMISSIONS.COUPON.VIEW, name: "Xem mã giảm giá" },
            { id: PERMISSIONS.COUPON.CREATE, name: "Tạo mã giảm giá" },
            { id: PERMISSIONS.COUPON.EDIT, name: "Sửa mã giảm giá" },
            { id: PERMISSIONS.CHAT.VIEW, name: "Xem chat" },
            { id: PERMISSIONS.CHAT.MANAGE, name: "Quản lý chat" },
            { id: PERMISSIONS.NOTIFICATION.VIEW, name: "Xem thông báo" },
            { id: PERMISSIONS.REVIEW.VIEW, name: "Xem đánh giá" },
            { id: PERMISSIONS.CALENDAR.VIEW, name: "Xem lịch" },
            { id: PERMISSIONS.SETTINGS.VIEW, name: "Xem cài đặt" },
            { id: PERMISSIONS.SETTINGS.EDIT, name: "Sửa cài đặt" },
        ]
    }
];

export const ALL_PERMISSIONS = PERMISSIONS_GROUPED.flatMap(group => group.permissions);

export const SKILLS = [
    { id: "check_results", name: "Tra cứu kết quả" },
    { id: "ticket_purchase", name: "Mua hộ vé số" },
    { id: "customer_support", name: "Hỗ trợ khách hàng" },
];
