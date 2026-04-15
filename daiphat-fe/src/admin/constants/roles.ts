import { PERMISSIONS } from "./permission.constants";

export const PERMISSIONS_GROUPED = [
    {
        module: "Tổng quan",
        permissions: [
            { id: PERMISSIONS.DASHBOARD.VIEW, name: "Xem bảng điều khiển" },
        ]
    },
    {
        module: "Quản lý Bài viết",
        permissions: [
            { id: PERMISSIONS.ARTICLE.VIEW, name: "Xem danh sách bài viết" },
            { id: PERMISSIONS.ARTICLE.CREATE, name: "Tạo bài viết mới" },
            { id: PERMISSIONS.ARTICLE.EDIT, name: "Chỉnh sửa bài viết" },
            { id: PERMISSIONS.ARTICLE.DELETE, name: "Xóa bài viết" },
        ]
    },
    {
        module: "Quản lý Vé số",
        permissions: [
            { id: PERMISSIONS.TICKET.VIEW, name: "Xem danh sách vé số" },
            { id: PERMISSIONS.TICKET.CREATE, name: "Tạo mới vé số" },
            { id: PERMISSIONS.TICKET.EDIT, name: "Chỉnh sửa vé số" },
            { id: PERMISSIONS.TICKET.DELETE, name: "Xóa vé số" },
            { id: PERMISSIONS.PROVIDER.VIEW, name: "Xem danh sách nhà đài" },
            { id: PERMISSIONS.PROVIDER.CREATE, name: "Tạo nhà đài" },
            { id: PERMISSIONS.PROVIDER.EDIT, name: "Sửa nhà đài" },
        ]
    },
    {
        module: "Quản lý Tiện ích",
        permissions: [
            { id: PERMISSIONS.TICKET_SERVICE.VIEW, name: "Xem danh sách tiện ích" },
            { id: PERMISSIONS.TICKET_SERVICE.CREATE, name: "Tạo mới tiện ích" },
            { id: PERMISSIONS.TICKET_SERVICE.EDIT, name: "Chỉnh sửa tiện ích" },
        ]
    },
    {
        module: "Đơn mua hộ & Tra vé",
        permissions: [
            { id: PERMISSIONS.TICKET_SERVICE_ORDER.VIEW, name: "Xem danh sách đơn mua hộ" },
            { id: PERMISSIONS.TICKET_SERVICE_ORDER.EDIT, name: "Cập nhật trạng thái đơn mua hộ" },
        ]
    },
    {
        module: "Mã giảm giá & Khách hàng",
        permissions: [
            { id: PERMISSIONS.COUPON.VIEW, name: "Xem mã giảm giá" },
            { id: PERMISSIONS.COUPON.CREATE, name: "Tạo mã giảm giá" },
            { id: PERMISSIONS.COUPON.EDIT, name: "Sửa mã giảm giá" },
            { id: PERMISSIONS.USER.VIEW, name: "Xem danh sách người dùng" },
            { id: PERMISSIONS.USER.CREATE, name: "Tạo người dùng mới" },
            { id: PERMISSIONS.USER.EDIT, name: "Sửa thông tin người dùng" },
            { id: PERMISSIONS.USER.DELETE, name: "Xóa người dùng" },
        ]
    },
    {
        module: "Nhóm quyền & Quản trị",
        permissions: [
            { id: PERMISSIONS.ROLE.VIEW, name: "Xem danh sách nhóm quyền" },
            { id: PERMISSIONS.ROLE.CREATE, name: "Tạo nhóm quyền mới" },
            { id: PERMISSIONS.ROLE.EDIT, name: "Chỉnh sửa phân quyền" },
            { id: PERMISSIONS.ROLE.DELETE, name: "Xóa nhóm quyền" },
        ]
    },
    {
        module: "Hệ thống & Calendar",
        permissions: [
            { id: PERMISSIONS.CALENDAR.VIEW, name: "Xem giao diện Calendar" },
            { id: PERMISSIONS.SETTINGS.VIEW, name: "Xem cài đặt hệ thống" },
            { id: PERMISSIONS.SETTINGS.EDIT, name: "Tùy chỉnh hệ thống" },
        ]
    }
];

export const ALL_PERMISSIONS = PERMISSIONS_GROUPED.flatMap(group => group.permissions);

export const SKILLS = [
    { id: "check_results", name: "Tra cứu kết quả" },
    { id: "ticket_purchase", name: "Mua hộ vé số" },
    { id: "customer_support", name: "Hỗ trợ khách hàng" },
];
