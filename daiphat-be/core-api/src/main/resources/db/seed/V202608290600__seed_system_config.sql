--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.system_config VALUES (1, 'ORDER_CANCEL_GRACE_MIN', '30', 'ORDER_SETTING', 'INT', 'Thời gian ân hạn hủy đơn (phút)', 'Ân hạn hủy đơn', 'phút', '{"min":0,"max":1440}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (2, 'CUSTOMER_CANCEL_CUTOFF', '14:30', 'ORDER_SETTING', 'TIME', 'Giờ chốt hủy đơn của khách hàng', 'Giờ chốt hủy đơn khách hàng', 'HH:mm', '{"min":"00:00","max":"23:59"}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (3, 'ORDER_PREPARE_SLA_MIN', '30', 'ORDER_SETTING', 'INT', 'SLA chuẩn bị đơn (phút)', 'SLA chuẩn bị đơn', 'phút', '{"min":1,"max":1440}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (4, 'ORDER_PAYMENT_COMPLAINT_REMINDER_ENABLED', 'true', 'ORDER_SETTING', 'BOOLEAN', 'Bật thông báo nhắc nhân viên khi có chứng từ thanh toán của đơn đã quá thời gian thanh toán.', 'Nhắc xử lý khiếu nại thanh toán', NULL, '{"allowedValues":["true","false"]}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (5, 'VENDOR_RETURN_CUTOFF', '15:00', 'VENDOR_SETTING', 'TIME', 'Giờ chốt trả vé cho đại lý (snapshot khi xác nhận bàn giao)', 'Giờ chốt trả vé đại lý', 'HH:mm', '{"min":"00:00","max":"23:59"}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (6, 'VENDOR_EFFECTIVE_HANDOVER_DEADLINE_RULE', 'Tự tính theo từng phiếu', 'VENDOR_SETTING', 'STRING', 'Hạn giao thực tế được tính theo từng phiếu: lấy mốc sớm hơn giữa giờ chốt người bán và giờ trả nhà cung cấp sớm nhất trừ thời gian đệm.', 'Cách tính hạn giao thực tế', NULL, '{"allowEmpty":false,"maxLength":255}', false, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (7, 'STAFF_INCIDENT_CUTOFF', '16:00', 'REFUND_SETTING', 'TIME', 'Giờ chốt xử lý sự cố của nhân viên', 'Giờ chốt xử lý sự cố', 'HH:mm', '{"min":"00:00","max":"23:59"}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (8, 'INVALID_INFO_EXPIRED_DAYS', '7', 'REFUND_SETTING', 'INT', 'Số ngày hết hạn thông tin không hợp lệ', 'Số ngày hết hạn thông tin không hợp lệ', 'ngày', '{"min":1,"max":365}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (9, 'MAX_REFUND_REQUESTS_PER_DAY', '3', 'REFUND_SETTING', 'INT', 'Số lượng yêu cầu hoàn tiền tối đa mỗi khách hàng được gửi trong một ngày', 'Số yêu cầu hoàn tối đa mỗi ngày', 'lần/ngày', '{"min":1,"max":100}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (10, 'MAX_REFUND_BANK_INFO_RETRY', '3', 'REFUND_SETTING', 'INT', 'Số lần tối đa khách hàng được phép cập nhật thông tin tài khoản ngân hàng sau khi chuyển khoản hoàn tiền thất bại', 'Số lần cập nhật TT ngân hàng tối đa', 'lần', '{"min":1,"max":20}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (11, 'TICKET_AUTO_IMPORT_THRESHOLD', '50', 'TICKET_IMPORT', 'INT', 'Số lượng vé lưu nháp tối đa trước khi hệ thống tự động lưu vào cơ sở dữ liệu.', 'Ngưỡng số lượng vé tự động nhập', 'vé', '{"min":1,"max":10000}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (13, 'RETURN_REMINDER_TIME', '15', 'TICKET_RETURN', 'INT', 'Thời gian (phút) trước hạn trả vé NCC để nhắc khẩn kiểm tra phiếu trả', 'Nhắc kiểm tra trả vé', 'phút', '{"min":1,"max":1440}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (16, 'PRIZE_PAYOUT_TAX_THRESHOLD', '10000000', 'PAYOUT_SETTING', 'INT', 'Ngưỡng miễn thuế TNCN trên giá trị giải (VND)', 'Ngưỡng thuế TNCN', 'VND', '{"min":0}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (17, 'PRIZE_PAYOUT_TAX_RATE', '0.10', 'PAYOUT_SETTING', 'DECIMAL', 'Thuế suất TNCN áp dụng phần vượt ngưỡng', 'Thuế suất TNCN', '%', '{"min":0,"max":1}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (18, 'PRIZE_PAYOUT_COMMISSION_TIERS', '[{"upTo":10000000,"rate":0.01},{"upTo":100000000,"rate":0.007},{"upTo":1000000000,"rate":0.004},{"upTo":null,"rate":0.002}]', 'PAYOUT_SETTING', 'JSON', 'Bậc thang hoa hồng đại lý trên giá trị giải gốc (trước thuế)', 'Hoa hồng trả thưởng', '%', '{}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (19, 'PRIZE_PAYOUT_COMPLAINT_PROCESSING_WAIT_HOURS', '48', 'COMPLAINT_SETTING', 'INT', 'Số giờ tối thiểu yêu cầu trả thưởng phải ở PENDING/APPROVED trước khi khiếu nại xử lý chậm', 'Thời gian chờ khiếu nại trả thưởng chậm', 'giờ', '{"min":1,"max":168}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (20, 'PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS', '15', 'COMPLAINT_SETTING', 'INT', 'Số ngày khiếu nại 1-click còn hiệu lực sau COMPLETED (tính từ completed_at). Hết hạn thì ẩn nút gắn claim; khách vẫn phản ánh qua hỗ trợ chung.', 'Thời hạn khiếu nại trả thưởng', 'ngày', '{"min":1,"max":30}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (21, 'FORTUNE_CAST_COOLDOWN_HOURS', '1440', 'FORTUNE_SETTING', 'INT', 'Độ dài mỗi khung giờ mở gieo quẻ theo giờ đồng hồ Việt Nam (căn từ 0h). Ví dụ 60 = mỗi giờ, 360 = mỗi 6 giờ, 1440 = mỗi ngày. Không tính từ lúc khách gieo.', 'Khung giờ mở gieo quẻ', 'phút', '{"min":1,"max":1440}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:09.646503', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (12, 'RETURN_BUFFER_TIME', '45', 'TICKET_RETURN', 'INT', 'Thời gian đệm (phút) trước hạn trả vé của nhà cung cấp', 'Thời gian đệm trả vé', 'phút', '{"min":0,"max":1440}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:11.416204', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (22, 'TICKET_IMPORT_FILE_CONFIG', '{
      "maxFileSizeMb": 2,
      "maxRows": 2000,
      "serialSeparator": ";",
      "storeOriginalFile": true,
      "allowPartialImport": true,
      "fieldAliases": {
        "drawDateColumn": ["ngayquay", "ngayxoso", "ngayso", "ngay", "drawdate", "date"],
        "stationCodeColumn": ["madai", "manhadai", "ma", "stationcode", "code"],
        "stationColumn": ["nhadai", "tendai", "dai", "tinh", "station", "lotterystation"],
        "quantityColumn": ["soluong", "sl", "sove", "quantity", "qty", "amount"],
        "numbersColumn": ["dayso", "sove", "sodu", "conso", "numbers", "ticketnumber", "so"],
        "serialsColumn": ["seri", "sori", "soseri", "danhsachseri", "serial", "serials", "serialnumber"],
        "ticketImageColumn": ["anhve", "hinhve", "anh", "hinh", "ticketimg", "ticketimage", "image", "photo", "url"],
        "importCostColumn": ["giavon", "dongia", "giave", "importcost", "unitprice", "price", "gia"]
      }
    }', 'TICKET_IMPORT', 'JSON', 'Giới hạn và quy ước khi đọc tệp .csv/.xlsx nhập vé, kèm alias tên cột tự nhận diện (dùng chung mọi NCC).', 'Cấu hình nhập vé từ tệp', NULL, '{}', true, true, '2026-08-29 04:47:13.580042', '2026-08-29 04:47:13.580042', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (23, 'PRIZE_REDEMPTION_OFFICIAL_DEADLINE_DAYS', '30', 'PAYOUT_SETTING', 'INT', 'Số ngày hạn lĩnh thưởng với nhà đài kể từ ngày quay (hạn thật). Hạn khách = hạn này trừ số ngày đệm.', 'Hạn lĩnh nhà đài (ngày)', 'ngày', '{"min":1,"max":365}', true, true, '2026-08-29 04:47:14.21259', '2026-08-29 04:47:14.21259', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (14, 'PRIZE_PAYOUT_ONLINE_MAX_AMOUNT', '10000000', 'PAYOUT_SETTING', 'INT', 'Giá trị giải tối đa khách được gửi yêu cầu trả thưởng trực tuyến (VND)', 'Hạn mức trả thưởng trực tuyến', 'VND', '{"min":0}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:14.301687', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (15, 'MAX_PRIZE_PAYOUT_ONLINE_REJECT', '3', 'PAYOUT_SETTING', 'INT', 'Số lần tối đa yêu cầu trả thưởng trực tuyến bị từ chối trước khi bắt buộc đổi thưởng tại đại lý', 'Số lần từ chối trả thưởng trực tuyến tối đa', 'lần', '{"min":1,"max":20}', true, true, '2026-08-29 04:47:09.646503', '2026-08-29 04:47:14.301993', 'SYSTEM', 'SYSTEM');
INSERT INTO public.system_config VALUES (24, 'PRIZE_REDEMPTION_BUFFER_DAYS', '5', 'PAYOUT_SETTING', 'INT', 'Số ngày đệm nội bộ trước hạn nhà đài. Hạn đổi thưởng hiển thị cho khách = hạn nhà đài − số ngày đệm. Phải nhỏ hơn hạn nhà đài.', 'Số ngày đệm hạn đổi thưởng', 'ngày', '{"min":0,"max":364}', true, true, '2026-08-29 04:47:14.21259', '2026-08-29 04:47:14.30027', 'SYSTEM', 'SYSTEM');


--
-- Name: system_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_config_id_seq', 24, true);


--
-- PostgreSQL database dump complete
--
