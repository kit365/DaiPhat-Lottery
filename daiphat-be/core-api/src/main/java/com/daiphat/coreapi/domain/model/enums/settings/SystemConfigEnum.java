package com.daiphat.coreapi.domain.model.enums.settings;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SystemConfigEnum {
    SITE_NAME(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "ĐẠI PHÁT",
            "Tên website hiển thị công khai",
            "Tên Website",
            null,
            "{\"allowEmpty\":false,\"maxLength\":255}",
            true
    ),
    SITE_DOMAIN(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "",
            "Tên miền chính thức của website (để trống nếu chưa cấu hình)",
            "Tên miền Website",
            null,
            "{\"allowEmpty\":true,\"maxLength\":255}",
            true
    ),
    SITE_LOGO_URL(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "",
            "URL logo website",
            "Logo Website",
            null,
            "{\"allowEmpty\":true,\"maxLength\":2048}",
            true
    ),
    SITE_FAVICON_URL(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "",
            "URL favicon website",
            "Favicon Website",
            null,
            "{\"allowEmpty\":true,\"maxLength\":2048}",
            true
    ),
    SITE_PHONE(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "1900 636 365",
            "Số điện thoại liên hệ công khai",
            "Số điện thoại",
            null,
            "{\"allowEmpty\":true,\"maxLength\":50}",
            true
    ),
    SITE_EMAIL(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "hotro@daiphat.id.vn",
            "Email liên hệ công khai",
            "Email",
            null,
            "{\"allowEmpty\":true,\"maxLength\":255}",
            true
    ),
    SITE_ADDRESS(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "123 Lý Chính Thắng, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh",
            "Địa chỉ liên hệ công khai",
            "Địa chỉ",
            null,
            "{\"allowEmpty\":true,\"maxLength\":500}",
            true
    ),
    SITE_LEGAL_NAME(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "ĐẠI PHÁT",
            "Tên pháp lý của đơn vị sử dụng khi lập hợp đồng",
            "Tên pháp lý đơn vị",
            null,
            "{\"allowEmpty\":true,\"maxLength\":500}",
            true
    ),
    SITE_TAX_CODE(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "0312345678",
            "Mã số thuế hoặc mã số đăng ký kinh doanh của đơn vị",
            "Mã số thuế / ĐKKD",
            null,
            "{\"allowEmpty\":true,\"maxLength\":50}",
            true
    ),
    SITE_LEGAL_REPRESENTATIVE(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "Nguyễn Văn Minh",
            "Họ tên người đại diện ký hợp đồng của đơn vị",
            "Người đại diện ký hợp đồng",
            null,
            "{\"allowEmpty\":true,\"maxLength\":255}",
            true
    ),
    SITE_LEGAL_REPRESENTATIVE_TITLE(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "Giám đốc",
            "Chức danh người đại diện ký hợp đồng của đơn vị",
            "Chức danh người đại diện",
            null,
            "{\"allowEmpty\":true,\"maxLength\":255}",
            true
    ),
    SITE_CONTRACT_SIGNING_PLACE(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "Thành phố Hồ Chí Minh",
            "Địa điểm lập hợp đồng hiển thị trên bản PDF",
            "Địa điểm lập hợp đồng",
            null,
            "{\"allowEmpty\":true,\"maxLength\":255}",
            true
    ),
    SITE_COPYRIGHT(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "© Đại Phát. All rights reserved.",
            "Thông tin bản quyền hiển thị footer",
            "Bản quyền (Copyright)",
            null,
            "{\"allowEmpty\":true,\"maxLength\":255}",
            true
    ),
    SITE_FACEBOOK_URL(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "",
            "Liên kết Facebook công khai",
            "Facebook",
            null,
            "{\"allowEmpty\":true,\"maxLength\":2048}",
            true
    ),
    SITE_INSTAGRAM_URL(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "",
            "Liên kết Instagram công khai",
            "Instagram",
            null,
            "{\"allowEmpty\":true,\"maxLength\":2048}",
            true
    ),
    SITE_TELEGRAM_URL(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "",
            "Liên kết Telegram công khai (footer)",
            "Telegram",
            null,
            "{\"allowEmpty\":true,\"maxLength\":2048}",
            true
    ),
    SITE_SLOGAN(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "TÀI LỘC - MAY MẮN - THỊNH VƯỢNG",
            "Slogan hiển thị dưới tên thương hiệu (footer)",
            "Slogan",
            null,
            "{\"allowEmpty\":true,\"maxLength\":255}",
            true
    ),
    SITE_INTRO(
            ConfigType.GENERAL_SETTING,
            DataType.STRING,
            "Đại Phát - Hệ thống xổ số kiến thiết uy tín hàng đầu Việt Nam. Nhanh chóng, minh bạch, bảo mật và luôn đồng hành cùng bạn trên hành trình may mắn.",
            "Đoạn giới thiệu ngắn trên footer",
            "Giới thiệu ngắn",
            null,
            "{\"allowEmpty\":true,\"maxLength\":1000}",
            true
    ),
    SITE_SUPPORT_OPEN_TIME(
            ConfigType.GENERAL_SETTING,
            DataType.TIME,
            "08:00",
            "Giờ bắt đầu hỗ trợ hotline (mỗi ngày)",
            "Giờ mở hỗ trợ",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    SITE_SUPPORT_CLOSE_TIME(
            ConfigType.GENERAL_SETTING,
            DataType.TIME,
            "22:00",
            "Giờ kết thúc hỗ trợ hotline (mỗi ngày)",
            "Giờ đóng hỗ trợ",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    PAGE_ABOUT(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Giới thiệu\",\"content\":\"\"}",
            "Nội dung trang Giới thiệu",
            "Trang Giới thiệu",
            null,
            "{}",
            true
    ),
    PAGE_FAQ(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Câu hỏi thường gặp\",\"content\":\"\"}",
            "Nội dung trang FAQ",
            "Trang FAQ",
            null,
            "{}",
            true
    ),
    PAGE_PRIVACY(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Chính sách bảo mật\",\"content\":\"\"}",
            "Nội dung trang Chính sách bảo mật",
            "Chính sách bảo mật",
            null,
            "{}",
            true
    ),
    PAGE_TERMS(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Điều khoản sử dụng\",\"content\":\"\"}",
            "Nội dung trang Điều khoản sử dụng",
            "Điều khoản sử dụng",
            null,
            "{}",
            true
    ),
    PAGE_SHIPPING(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Chính sách vận chuyển\",\"content\":\"\"}",
            "Nội dung trang Chính sách vận chuyển",
            "Chính sách vận chuyển",
            null,
            "{}",
            true
    ),
    PAGE_RETURNS(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Chính sách đổi trả\",\"content\":\"\"}",
            "Nội dung trang Chính sách đổi trả",
            "Chính sách đổi trả",
            null,
            "{}",
            true
    ),
    PAGE_CONTACT(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Liên hệ\",\"content\":\"\"}",
            "Nội dung trang Liên hệ",
            "Trang Liên hệ",
            null,
            "{}",
            true
    ),
    PAGE_CAREERS(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Tuyển dụng\",\"content\":\"\"}",
            "Nội dung trang Tuyển dụng",
            "Trang Tuyển dụng",
            null,
            "{}",
            true
    ),
    PAGE_GUIDE_PLAY(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Hướng dẫn chơi\",\"content\":\"\"}",
            "Nội dung trang Hướng dẫn chơi",
            "Hướng dẫn chơi",
            null,
            "{}",
            true
    ),
    PAGE_GUIDE_BUY(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Hướng dẫn mua vé\",\"content\":\"\"}",
            "Nội dung trang Hướng dẫn mua vé",
            "Hướng dẫn mua vé",
            null,
            "{}",
            true
    ),
    PAGE_GUIDE_PAYMENT(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Hướng dẫn thanh toán\",\"content\":\"\"}",
            "Nội dung trang Hướng dẫn thanh toán",
            "Hướng dẫn thanh toán",
            null,
            "{}",
            true
    ),
    PAGE_GUIDE_PRIZE(
            ConfigType.STATIC_PAGE,
            DataType.JSON,
            "{\"title\":\"Hướng dẫn nhận thưởng\",\"content\":\"\"}",
            "Nội dung trang Hướng dẫn nhận thưởng",
            "Hướng dẫn nhận thưởng",
            null,
            "{}",
            true
    ),
    ORDER_CANCEL_GRACE_MIN(
            ConfigType.ORDER_SETTING,
            DataType.INT,
            "30",
            "Thời gian ân hạn hủy đơn (phút)",
            "Thời gian ân hạn hủy đơn",
            "phút",
            "{\"min\":1,\"max\":1440}",
            true
    ),
    CUSTOMER_CANCEL_CUTOFF(
            ConfigType.ORDER_SETTING,
            DataType.TIME,
            "14:30",
            "Giờ chốt hủy đơn của khách hàng",
            "Giờ chốt hủy đơn khách hàng",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    ORDER_PREPARE_SLA_MIN(
            ConfigType.ORDER_SETTING,
            DataType.INT,
            "30",
            "SLA chuẩn bị đơn (phút)",
            "SLA chuẩn bị đơn",
            "phút",
            "{\"min\":1,\"max\":1440}",
            true
    ),
    PAYMENT_TIMEOUT_MINUTES(
            ConfigType.PAYMENT_SETTING,
            DataType.INT,
            "3",
            "Thời gian chờ thanh toán trước khi hệ thống tự động hủy đơn (phút)",
            "Thời gian chờ thanh toán",
            "phút",
            "{}",
            false
    ),
    // Phase 3: snapshotted onto allocation batch at confirm; used for late-return settlement.
    VENDOR_RETURN_CUTOFF(
            ConfigType.VENDOR_SETTING,
            DataType.TIME,
            "15:00",
            "Giờ chốt trả vé cho đại lý (Phase 3: snapshot khi xác nhận bàn giao)",
            "Giờ chốt trả vé đại lý",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    VENDOR_EFFECTIVE_HANDOVER_DEADLINE_RULE(
            ConfigType.VENDOR_SETTING,
            DataType.STRING,
            "Tự tính theo từng phiếu",
            "Hạn giao thực tế không phải setting cố định. Hệ thống lấy mốc sớm hơn giữa giờ chốt người bán và giờ trả nhà cung cấp sớm nhất trừ thời gian đệm.",
            "Cách tính hạn giao thực tế",
            null,
            "{\"allowEmpty\":false,\"maxLength\":255}",
            false
    ),
    VENDOR_COMMISSION_RATE(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.10",
            "Tỷ lệ hoa hồng chung trả cho người bán dạo trên mỗi vé bán thành công. Giá vendor được tính từ mệnh giá trừ tỷ lệ này.",
            "Tỷ lệ hoa hồng vendor",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP(
            ConfigType.VENDOR_SETTING,
            DataType.INT,
            "200",
            "Giới hạn số vé tối đa cho mỗi phiếu bàn giao, được ghi trong hợp đồng khi tạo người bán vé số mới.",
            "Hạn mức hợp đồng mặc định",
            "vé/phiếu",
            "{\"min\":1,\"max\":100000}",
            true
    ),
    VENDOR_DEPOSIT_RATE(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.10",
            "Tỷ lệ tiền cọc tính trên tổng giá trị vendor của batch",
            "Tỷ lệ cọc vendor",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    // Phase 3: snapshotted onto allocation batch at confirm; applied on late return settlement.
    VENDOR_LATE_RETURN_POLICY(
            ConfigType.VENDOR_SETTING,
            DataType.STRING,
            "FORFEIT_DEPOSIT",
            "Chính sách xử lý khi vendor trả vé sau giờ chốt (Phase 3)",
            "Chính sách trả vé trễ",
            null,
            "{\"allowedValues\":[\"FORFEIT_DEPOSIT\",\"FORCE_PURCHASE_ALL\"]}",
            true
    ),
    VENDOR_DRAFT_RESERVATION_TTL_MINUTES(
            ConfigType.VENDOR_SETTING,
            DataType.INT,
            "15",
            "Thời gian giữ vé khi phiếu bàn giao ở trạng thái nháp",
            "Thời gian giữ vé nháp",
            "phút",
            "{\"min\":1,\"max\":120}",
            true
    ),
    VENDOR_CONFIDENCE_DEVELOPING_MIN_SCORE(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "40",
            "Điểm tối thiểu để đạt tier DEVELOPING",
            "Ngưỡng điểm DEVELOPING",
            "điểm",
            "{\"min\":0,\"max\":100}",
            true
    ),
    VENDOR_CONFIDENCE_ESTABLISHED_MIN_SCORE(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "60",
            "Điểm tối thiểu để đạt tier ESTABLISHED",
            "Ngưỡng điểm ESTABLISHED",
            "điểm",
            "{\"min\":0,\"max\":100}",
            true
    ),
    VENDOR_CONFIDENCE_TRUSTED_MIN_SCORE(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "80",
            "Điểm tối thiểu để đạt tier TRUSTED",
            "Ngưỡng điểm TRUSTED",
            "điểm",
            "{\"min\":0,\"max\":100}",
            true
    ),
    VENDOR_CONFIDENCE_DEVELOPING_MIN_BATCHES(
            ConfigType.VENDOR_SETTING,
            DataType.INT,
            "5",
            "Số batch settle tối thiểu để mở trần DEVELOPING",
            "Ngưỡng batch DEVELOPING",
            "batch",
            "{\"min\":1,\"max\":1000}",
            true
    ),
    VENDOR_CONFIDENCE_ESTABLISHED_MIN_BATCHES(
            ConfigType.VENDOR_SETTING,
            DataType.INT,
            "10",
            "Số batch settle tối thiểu để mở trần ESTABLISHED",
            "Ngưỡng batch ESTABLISHED",
            "batch",
            "{\"min\":1,\"max\":1000}",
            true
    ),
    VENDOR_CONFIDENCE_TRUSTED_MIN_BATCHES(
            ConfigType.VENDOR_SETTING,
            DataType.INT,
            "20",
            "Số batch settle tối thiểu để mở trần TRUSTED",
            "Ngưỡng batch TRUSTED",
            "batch",
            "{\"min\":1,\"max\":1000}",
            true
    ),
    VENDOR_CONFIDENCE_NEW_CAP_PERCENT(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.25",
            "Tỷ lệ daily cap cho tier NEW",
            "Cap % NEW",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_CONFIDENCE_DEVELOPING_CAP_PERCENT(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.50",
            "Tỷ lệ daily cap cho tier DEVELOPING",
            "Cap % DEVELOPING",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_CONFIDENCE_ESTABLISHED_CAP_PERCENT(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.75",
            "Tỷ lệ daily cap cho tier ESTABLISHED",
            "Cap % ESTABLISHED",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_CONFIDENCE_TRUSTED_CAP_PERCENT(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "1.00",
            "Tỷ lệ daily cap cho tier TRUSTED",
            "Cap % TRUSTED",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_CONFIDENCE_ON_TIME_WEIGHT(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.50",
            "Trọng số on-time trong công thức confidence (tổng 3 trọng số = 1)",
            "Trọng số đúng hạn",
            null,
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.40",
            "Trọng số sell-through trong công thức confidence (tổng 3 trọng số = 1)",
            "Trọng số bán ra",
            null,
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.10",
            "Trọng số experience trong công thức confidence (tổng 3 trọng số = 1)",
            "Trọng số kinh nghiệm",
            null,
            "{\"min\":0,\"max\":1}",
            true
    ),
    VENDOR_CONFIDENCE_EXPERIENCE_WINDOW(
            ConfigType.VENDOR_SETTING,
            DataType.INT,
            "30",
            "Số batch settle gần nhất dùng để tính confidence",
            "Cửa sổ kinh nghiệm",
            "batch",
            "{\"min\":1,\"max\":500}",
            true
    ),
    STREET_AGENT_COUNTER_RESERVE_PER_STATION(
            ConfigType.VENDOR_SETTING,
            DataType.INT,
            "10",
            "Số vé thường tối thiểu phải chừa cho quầy trên mỗi đài xổ",
            "Tồn tối thiểu chừa quầy",
            "vé/đài",
            "{\"min\":0,\"max\":100000}",
            true
    ),
    STREET_AGENT_COUNTER_RESERVE_PERCENT_PER_STATION(
            ConfigType.VENDOR_SETTING,
            DataType.DECIMAL,
            "0.20",
            "Tỷ lệ vé thường hợp lệ phải chừa cho quầy tại mỗi đài. Mức giữ thực tế lấy giá trị lớn hơn giữa tỷ lệ này và tồn tối thiểu chừa quầy.",
            "Tỷ lệ tồn chừa quầy",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    RETURN_BUFFER_TIME(
            ConfigType.TICKET_RETURN,
            DataType.INT,
            "45",
            "Thời gian đệm (phút) trước hạn trả vé NCC. >0: chỉ được chuẩn bị/kiểm tra trả từ (hạn trả − đệm). =0: cho phép chuẩn bị/kiểm tra ngay trong ngày (đến trước hạn trả).",
            "Thời gian đệm trả vé",
            "phút",
            "{\"min\":0,\"max\":1440}",
            true
    ),
    RETURN_REMINDER_TIME(
            ConfigType.TICKET_RETURN,
            DataType.INT,
            "10",
            "Số phút cuối trước hạn trả vé NCC để hối thúc kiểm đếm / bàn giao phiếu trả chưa hoàn tất.",
            "Giờ hối thúc trả vé",
            "phút",
            "{\"min\":1,\"max\":1440}",
            true
    ),
    SETTLEMENT_BUFFER_TIME(
            ConfigType.SETTLEMENT_SETTING,
            DataType.INT,
            "120",
            "Thời gian đệm (phút) trước giờ thanh toán của từng NCC (paymentCutOffTime). >0: chỉ được đối soát từ (paymentCutOff − đệm). =0: cho phép đối soát ngay trong ngày kỳ.",
            "Thời gian đệm trước thanh toán",
            "phút",
            "{\"min\":0,\"max\":1440}",
            true
    ),
    SETTLEMENT_PAYMENT_REMINDER_MINUTES(
            ConfigType.SETTLEMENT_SETTING,
            DataType.INT,
            "10",
            "Số phút cuối trước giờ thanh toán của từng NCC (paymentCutOffTime) để nhắc các kỳ đối soát chưa hoàn tất thanh toán.",
            "Nhắc thanh toán cuối kỳ",
            "phút",
            "{\"min\":1,\"max\":180}",
            true
    ),
    TICKET_AUTO_IMPORT_THRESHOLD(
            ConfigType.TICKET_IMPORT,
            DataType.INT,
            "50",
            "Số lượng vé lưu nháp tối đa trước khi hệ thống tự động lưu vào cơ sở dữ liệu.",
            "Ngưỡng số lượng vé tự động nhập",
            "vé",
            "{\"min\":1,\"max\":10000}",
            true
    ),
    IMPORT_BATCH_TICKET_LIST_IMAGE_MAX_COUNT(
            ConfigType.TICKET_IMPORT,
            DataType.INT,
            "5",
            "Số ảnh danh sách vé nhập tối đa được đính trên một phiếu nhập lô.",
            "Số ảnh danh sách vé nhập tối đa",
            "ảnh",
            "{\"min\":1,\"max\":20}",
            true
    ),
    IMPORT_BATCH_TICKET_LIST_IMAGE_MAX_SIZE_MB(
            ConfigType.TICKET_IMPORT,
            DataType.INT,
            "5",
            "Dung lượng tối đa mỗi ảnh danh sách vé nhập trên phiếu nhập lô.",
            "Dung lượng tối đa mỗi ảnh danh sách vé",
            "MB",
            "{\"min\":1,\"max\":10}",
            true
    ),
    STAFF_INCIDENT_CUTOFF(
            ConfigType.REFUND_SETTING,
            DataType.TIME,
            "16:00",
            "Giờ chốt xử lý sự cố của nhân viên",
            "Giờ chốt xử lý sự cố",
            "HH:mm",
            "{\"min\":\"00:00\",\"max\":\"23:59\"}",
            true
    ),
    INVALID_INFO_EXPIRED_DAYS(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "7",
            "Số ngày hết hạn thông tin không hợp lệ",
            "Số ngày hết hạn thông tin không hợp lệ",
            "ngày",
            "{\"min\":1,\"max\":365}",
            true
    ),
    MAX_REFUND_REQUESTS_PER_DAY(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "3",
            "Số lượng yêu cầu hoàn tiền tối đa mỗi khách hàng được gửi trong một ngày",
            "Số yêu cầu hoàn tối đa mỗi ngày",
            "lần/ngày",
            "{\"min\":1,\"max\":100}",
            true
    ),
    MAX_REFUND_BANK_INFO_RETRY(
            ConfigType.REFUND_SETTING,
            DataType.INT,
            "3",
            "Số lần tối đa khách hàng được phép cập nhật thông tin tài khoản ngân hàng sau khi chuyển khoản hoàn tiền thất bại",
            "Số lần cập nhật TT ngân hàng tối đa",
            "lần",
            "{\"min\":1,\"max\":20}",
            true
    ),
    REFUND_COMPLAINT_PROCESSING_WAIT_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "48",
            "Số giờ tối thiểu yêu cầu hoàn tiền phải ở WAITING_FOR_INFO/READY_TO_PAY trước khi khiếu nại xử lý chậm",
            "Thời gian chờ khiếu nại xử lý hoàn tiền chậm",
            "giờ",
            "{}",
            false
    ),
    REFUND_COMPLAINT_GRACE_DAYS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "7",
            "Số ngày khiếu nại còn hiệu lực sau khi yêu cầu hoàn tiền ở trạng thái cuối (PAID/MANUAL_RESOLUTION), tối đa 15",
            "Thời hạn khiếu nại hoàn tiền",
            "ngày",
            "{}",
            false
    ),
    SUPPORT_TICKET_AUTO_CLOSE_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "48",
            "Số giờ tự động đóng ticket sau khi được đánh dấu đã giải quyết nếu khách hàng không phản hồi",
            "Thời gian tự đóng ticket",
            "giờ",
            "{}",
            false
    ),
    ORDER_COMPLAINT_DRAW_CUTOFF_TIME(
            ConfigType.COMPLAINT_SETTING,
            DataType.TIME,
            "15:00",
            "Giờ gần mở thưởng sau đó khách có thể khiếu nại đơn còn ở PAID/PREPARING",
            "Giờ chốt khiếu nại đơn trước quay số",
            "HH:mm",
            "{}",
            false
    ),
    ORDER_SERVICE_COMPLAINT_WINDOW_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "24",
            "Số giờ khách được khiếu nại chất lượng dịch vụ sau khi đơn hoàn thành",
            "Thời hạn khiếu nại chất lượng dịch vụ",
            "giờ",
            "{}",
            false
    ),
    ORDER_STATUS_DELAY_COMPLAINT_MINUTES(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "15",
            "Số phút đơn ở PAID/PREPARING không đổi trạng thái trước khi khách được khiếu nại xử lý chậm",
            "Thời gian chờ khiếu nại xử lý đơn chậm",
            "phút",
            "{}",
            false
    ),
    ORDER_CANCELLED_COMPLAINT_WINDOW_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "24",
            "Số giờ khách được khiếu nại sau khi đơn bị hủy do sự cố hết vé",
            "Thời hạn khiếu nại đơn hủy hết vé",
            "giờ",
            "{}",
            false
    ),
    PRIZE_PAYOUT_COMPLAINT_PROCESSING_WAIT_HOURS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "48",
            "Số giờ tối thiểu yêu cầu trả thưởng phải ở PENDING/APPROVED trước khi khiếu nại xử lý chậm",
            "Thời gian chờ khiếu nại trả thưởng chậm",
            "giờ",
            "{\"min\":1,\"max\":168}",
            true
    ),
    PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS(
            ConfigType.COMPLAINT_SETTING,
            DataType.INT,
            "15",
            "Số ngày khiếu nại 1-click còn hiệu lực sau COMPLETED (tính từ completed_at). Hết hạn thì ẩn nút gắn claim; khách vẫn phản ánh qua hỗ trợ chung.",
            "Thời hạn khiếu nại trả thưởng",
            "ngày",
            "{\"min\":1,\"max\":30}",
            true
    ),
    PRIZE_PAYOUT_ONLINE_MAX_AMOUNT(
            ConfigType.PAYOUT_SETTING,
            DataType.INT,
            "10000000",
            "Giá trị giải tối đa khách được gửi yêu cầu trả thưởng online (VND)",
            "Hạn mức trả thưởng online",
            "VND",
            "{\"min\":0}",
            true
    ),
    MAX_PRIZE_PAYOUT_ONLINE_REJECT(
            ConfigType.PAYOUT_SETTING,
            DataType.INT,
            "3",
            "Số lần tối đa yêu cầu trả thưởng online bị từ chối trước khi bắt buộc đổi thưởng tại đại lý",
            "Số lần từ chối trả thưởng online tối đa",
            "lần",
            "{\"min\":1,\"max\":20}",
            true
    ),
    PRIZE_PAYOUT_TAX_THRESHOLD(
            ConfigType.PAYOUT_SETTING,
            DataType.INT,
            "10000000",
            "Ngưỡng miễn thuế TNCN trên giá trị giải (VND)",
            "Ngưỡng thuế TNCN",
            "VND",
            "{\"min\":0}",
            true
    ),
    PRIZE_PAYOUT_TAX_RATE(
            ConfigType.PAYOUT_SETTING,
            DataType.DECIMAL,
            "0.10",
            "Thuế suất TNCN áp dụng phần vượt ngưỡng",
            "Thuế suất TNCN",
            "%",
            "{\"min\":0,\"max\":1}",
            true
    ),
    PRIZE_PAYOUT_COMMISSION_TIERS(
            ConfigType.PAYOUT_SETTING,
            DataType.JSON,
            "[{\"upTo\":10000000,\"rate\":0.01},{\"upTo\":100000000,\"rate\":0.007},{\"upTo\":1000000000,\"rate\":0.004},{\"upTo\":null,\"rate\":0.002}]",
            "Bậc thang hoa hồng đại lý trên giá trị giải gốc (trước thuế)",
            "Hoa hồng trả thưởng",
            "%",
            "{}",
            true
    ),
    PRIZE_PAYOUT_CONTRACT_ADDITIONAL_TERMS(
            ConfigType.PAYOUT_SETTING,
            DataType.STRING,
            "Người nhận cam kết là chủ sở hữu hợp pháp của vé hoặc được ủy quyền hợp lệ; chịu trách nhiệm trước pháp luật nếu thông tin CCCD/CMND không đúng. Đại lý chỉ trả thưởng theo kết quả đối chiếu hệ thống và giấy tờ đã thu thập tại thời điểm lập hợp đồng.",
            "Điều khoản bổ sung in trên hợp đồng xác nhận trả thưởng (cùng khung pháp lý Bên A với hợp đồng cộng tác bán vé số).",
            "Điều khoản hợp đồng trả thưởng",
            null,
            "{\"allowEmpty\":true,\"maxLength\":4000}",
            true
    ),
    /**
     * Wall-clock slot length in minutes (aligned from 00:00 Asia/Ho_Chi_Minh).
     * Example: 60 = once per clock hour, 360 = every 6 hours, 1440 = once per calendar day.
     */
    /**
     * One JSON blob rather than five separate keys: these settings are only ever
     * read together by the file importer, and the import dialog shows them as a
     * single "current configuration" panel.
     */
    TICKET_IMPORT_FILE_CONFIG(
            ConfigType.TICKET_IMPORT,
            DataType.JSON,
            // Default fieldAliases mirror ImportBatchFileMappingDetector; Flyway seeds the same JSON.
            "{\"maxFileSizeMb\":2,\"maxRows\":2000,\"serialSeparator\":\";\","
                    + "\"storeOriginalFile\":true,\"allowPartialImport\":true,"
                    + "\"fieldAliases\":{"
                    + "\"drawDateColumn\":[\"ngayquay\",\"ngayxoso\",\"ngayso\",\"ngay\",\"drawdate\",\"date\"],"
                    + "\"stationCodeColumn\":[\"madai\",\"manhadai\",\"ma\",\"stationcode\",\"code\"],"
                    + "\"stationColumn\":[\"nhadai\",\"tendai\",\"dai\",\"tinh\",\"station\",\"lotterystation\"],"
                    + "\"quantityColumn\":[\"soluong\",\"sl\",\"sove\",\"quantity\",\"qty\",\"amount\"],"
                    + "\"numbersColumn\":[\"dayso\",\"sove\",\"sodu\",\"conso\",\"numbers\",\"ticketnumber\",\"so\"],"
                    + "\"serialsColumn\":[\"seri\",\"sori\",\"soseri\",\"danhsachseri\",\"serial\",\"serials\",\"serialnumber\"],"
                    + "\"ticketImageColumn\":[\"anhve\",\"hinhve\",\"anh\",\"hinh\",\"ticketimg\",\"ticketimage\",\"image\",\"photo\",\"url\"],"
                    + "\"importCostColumn\":[\"giavon\",\"dongia\",\"giave\",\"importcost\",\"unitprice\",\"price\",\"gia\"]"
                    + "}}",
            "Giới hạn và quy ước khi đọc tệp .csv/.xlsx nhập vé, kèm alias tên cột tự nhận diện (dùng chung mọi NCC).",
            "Cấu hình nhập vé từ tệp",
            null,
            "{}",
            true
    ),
    FORTUNE_CAST_COOLDOWN_HOURS(
            ConfigType.FORTUNE_SETTING,
            DataType.INT,
            "1440",
            "Độ dài mỗi khung giờ mở gieo quẻ theo giờ đồng hồ Việt Nam (căn từ 0h). Ví dụ 60 = mỗi giờ, 360 = mỗi 6 giờ, 1440 = mỗi ngày. Không tính từ lúc khách gieo.",
            "Khung giờ mở gieo quẻ",
            "phút",
            "{\"min\":1,\"max\":1440}",
            true
    );

    private final ConfigType configType;
    private final DataType dataType;
    private final String defaultValue;
    private final String description;
    private final String configName;
    private final String unit;
    private final String validationRules;
    private final boolean editable;
}
