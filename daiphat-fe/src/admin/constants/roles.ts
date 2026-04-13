export const PERMISSIONS_GROUPED = [
    {
        module: "Tổng quan",
        permissions: [
            { id: "dashboard_view", name: "Xem bảng điều khiển" },
        ]
    },
    {
        module: "Quản lý Bài viết",
        permissions: [
            { id: "blog_view", name: "Xem danh sách bài viết" },
            { id: "blog_create", name: "Tạo bài viết mới" },
            { id: "blog_edit", name: "Chỉnh sửa bài viết" },
            { id: "blog_delete", name: "Xóa bài viết" },
            { id: "blog_category_view", name: "Xem danh mục bài viết" },
            { id: "blog_category_create", name: "Tạo danh mục bài viết" },
            { id: "blog_category_edit", name: "Sửa danh mục bài viết" },
            { id: "blog_category_delete", name: "Xóa danh mục bài viết" },
        ]
    },
    {
        module: "Quản lý Vé số",
        permissions: [
            { id: "ticket_view", name: "Xem danh sách vé số" },
            { id: "ticket_create", name: "Tạo mới vé số" },
            { id: "ticket_edit", name: "Chỉnh sửa vé số" },
            { id: "ticket_delete", name: "Xóa vé số" },
            { id: "ticket_category_view", name: "Xem loại hình xổ số" },
            { id: "ticket_category_create", name: "Tạo loại hình xổ số" },
            { id: "ticket_category_edit", name: "Sửa loại hình xổ số" },
            { id: "ticket_category_delete", name: "Xóa loại hình xổ số" },
            { id: "provider_view", name: "Xem danh sách nhà đài" },
            { id: "provider_create", name: "Tạo nhà đài" },
            { id: "provider_edit", name: "Sửa nhà đài" },
            { id: "provider_delete", name: "Xóa nhà đài" },
            { id: "ticket_attribute_view", name: "Xem thông số vé" },
            { id: "ticket_attribute_create", name: "Tạo thông số vé" },
            { id: "ticket_attribute_edit", name: "Sửa thông số vé" },
            { id: "ticket_attribute_delete", name: "Xóa thông số vé" },
        ]
    },
    {
        module: "Quản lý Tiện ích",
        permissions: [
            { id: "ticketService_view", name: "Xem danh sách tiện ích" },
            { id: "ticketService_create", name: "Tạo mới tiện ích" },
            { id: "ticketService_edit", name: "Chỉnh sửa tiện ích" },
            { id: "ticketService_delete", name: "Xóa tiện ích" },
            { id: "ticketService_category_view", name: "Xem danh mục tiện ích" },
            { id: "ticketService_category_create", name: "Tạo danh mục tiện ích" },
            { id: "ticketService_category_edit", name: "Sửa danh mục tiện ích" },
            { id: "ticketService_category_delete", name: "Xóa danh mục tiện ích" },
            { id: "ticketSubtype_view", name: "Quản lý Tỉnh thành quay thưởng" },
            { id: "ticketSubtype_create", name: "Tạo mới tỉnh thành" },
            { id: "ticketSubtype_edit", name: "Sửa tỉnh thành" },
            { id: "ticketSubtype_delete", name: "Xóa tỉnh thành" },
        ]
    },
    {
        module: "Đơn mua hộ & Tra vé",
        permissions: [
            { id: "ticketServiceOrder_view", name: "Xem danh sách đơn mua hộ" },
            { id: "ticketServiceOrder_create", name: "Tạo mới đơn mua hộ" },
            { id: "ticketServiceOrder_edit", name: "Cập nhật trạng thái đơn mua hộ" },
            { id: "ticketServiceOrder_delete", name: "Xóa đơn mua hộ" },
            { id: "ticketServiceOrder_view_all", name: "Xem tất cả lịch trình" },
            { id: "ticketServiceOrder_assign", name: "Điều phối nhân viên xử lý" },
            { id: "ticketServiceOrder_export", name: "Xuất hóa đơn/Kết quả" },
        ]
    },
    {
        module: "Mã giảm giá & Khách hàng",
        permissions: [
            { id: "coupon_view", name: "Xem mã giảm giá" },
            { id: "coupon_create", name: "Tạo mã giảm giá" },
            { id: "coupon_edit", name: "Sửa mã giảm giá" },
            { id: "coupon_delete", name: "Xóa mã giảm giá" },
            { id: "account_user_view", name: "Xem thông tin khách hàng" },
            { id: "account_user_create", name: "Tạo tài khoản khách hàng" },
            { id: "account_user_edit", name: "Sửa thông tin khách hàng" },
            { id: "account_user_delete", name: "Xóa khách hàng" },
        ]
    },
    {
        module: "Nhóm quyền & Quản trị",
        permissions: [
            { id: "role_view", name: "Xem danh sách nhóm quyền" },
            { id: "role_create", name: "Tạo nhóm quyền mới" },
            { id: "role_edit", name: "Cập nhật phân quyền" },
            { id: "role_delete", name: "Xóa nhóm quyền" },
            { id: "role_permissions", name: "Truy cập Phân quyền nâng cao" },
            { id: "account_admin_view", name: "Xem tài khoản quản trị" },
            { id: "account_admin_create", name: "Tạo tài khoản quản trị" },
            { id: "account_admin_edit", name: "Sửa tài khoản quản trị" },
            { id: "account_admin_delete", name: "Xóa tài khoản quản trị" },
        ]
    },
    {
        module: "Nhân sự & Vận hành (HR)",
        permissions: [
            { id: "hr_view", name: "Xem tổng quan nhân sự" },
            { id: "department_view", name: "Quản lý phòng ban" },
            { id: "shift_view", name: "Xem danh sách ca làm" },
            { id: "shift_create", name: "Thiết lập ca làm mới" },
            { id: "shift_edit", name: "Chỉnh sửa ca làm" },
            { id: "shift_delete", name: "Xóa ca làm" },
            { id: "schedule_view", name: "Xem lịch làm việc tuần" },
            { id: "schedule_create", name: "Phân ca làm việc" },
            { id: "schedule_edit", name: "Cập nhật lịch làm việc" },
            { id: "schedule_delete", name: "Xóa lịch làm việc" },
        ]
    },
    {
        module: "Hệ thống & Calendar",
        permissions: [
            { id: "calendar_view", name: "Xem giao diện Calendar" },
            { id: "settings_view", name: "Xem cài đặt hệ thống" },
            { id: "settings_edit", name: "Tùy chỉnh hệ thống" },
            { id: "file_manager", name: "Quản lý thư viện ảnh/file" },
        ]
    }
];

export const PERMISSIONS = PERMISSIONS_GROUPED.flatMap(group => group.permissions);

export const SKILLS = [
    { id: "check_results", name: "Tra cứu kết quả" },
    { id: "ticket_purchase", name: "Mua hộ vé số" },
    { id: "customer_support", name: "Hỗ trợ khách hàng" },
];
