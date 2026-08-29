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
-- Data for Name: ticket_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ticket_categories VALUES (4, 'Đơn hàng', 'GROUP_ORDER', 'Nhóm khiếu nại liên quan đến đơn hàng', 1, NULL, NULL, true, '2026-08-29 04:47:09.547583', '2026-08-29 04:47:09.547583', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (5, 'Thanh toán & Hoàn tiền', 'GROUP_PAYMENT', 'Nhóm khiếu nại thanh toán và hoàn tiền', 1, NULL, NULL, true, '2026-08-29 04:47:09.547583', '2026-08-29 04:47:09.547583', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (6, 'Hỗ trợ chung', 'GROUP_GENERAL', 'Nhóm các yêu cầu hỗ trợ khác', 2, NULL, NULL, true, '2026-08-29 04:47:09.547583', '2026-08-29 04:47:09.547583', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (7, 'Khiếu nại trả thưởng', 'GROUP_PRIZE_PAYOUT', 'Nhóm khiếu nại liên quan đến trả thưởng / nhận thưởng', 3, NULL, NULL, true, '2026-08-29 04:47:09.547583', '2026-08-29 04:47:09.547583', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (1, 'Khiếu nại đơn hàng', 'ORDER_ISSUE', 'Khiếu nại liên quan đến đơn hàng đã đặt', 1, 'ORDER', 4, true, '2026-08-29 04:47:09.547085', '2026-08-29 04:47:09.547085', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (2, 'Lỗi thanh toán', 'PAYMENT_ISSUE', 'Khiếu nại về giao dịch thanh toán', 1, 'PAYMENT_TRANSACTION', 5, true, '2026-08-29 04:47:09.547085', '2026-08-29 04:47:09.547085', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (3, 'Hỗ trợ chung', 'GENERAL', 'Yêu cầu hỗ trợ không gắn đối tượng cụ thể', 2, NULL, 6, true, '2026-08-29 04:47:09.547085', '2026-08-29 04:47:09.547085', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (8, 'Nhân viên xử lý hoàn tiền quá lâu', 'REFUND_SLOW_PROCESSING', 'Khiếu nại khi yêu cầu hoàn tiền bị treo quá thời gian cam kết xử lý', 1, 'REFUND_REQUEST', 5, true, '2026-08-29 04:47:09.741009', '2026-08-29 04:47:09.741009', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (9, 'Khiếu nại hoàn tiền đã chuyển', 'REFUND_PAID_ISSUE', 'Khiếu nại về số tiền sai, thiếu hoàn, lỗi chuyển khoản hoặc vấn đề khác sau khi đã chuyển tiền', 3, 'REFUND_REQUEST', 5, true, '2026-08-29 04:47:09.741009', '2026-08-29 04:47:09.741009', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (10, 'Lỗi đồng bộ thanh toán', 'PAYMENT_SYNC_ERROR', 'Khiếu nại khi đơn bị hủy do quá thời gian thanh toán nhưng khách đã chuyển khoản thành công', 2, 'ORDER', 4, true, '2026-08-29 04:47:09.833496', '2026-08-29 04:47:09.833496', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (11, 'Chuẩn bị đơn chậm', 'ORDER_PREPARATION_DELAY', 'Khiếu nại khi cửa hàng chuẩn bị đơn chậm hoặc quá giờ mở thưởng', 3, 'ORDER', 4, true, '2026-08-29 04:47:09.833496', '2026-08-29 04:47:09.833496', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (12, 'Không nhận được vé', 'ORDER_PICKUP_ISSUE', 'Khiếu nại khi khách không thể nhận vé khi đơn đang chờ nhận', 4, 'ORDER', 4, true, '2026-08-29 04:47:09.833496', '2026-08-29 04:47:09.833496', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (13, 'Chất lượng dịch vụ', 'ORDER_SERVICE_QUALITY', 'Khiếu nại về thái độ nhân viên hoặc chất lượng phục vụ sau khi đơn hoàn thành', 6, 'ORDER', 4, true, '2026-08-29 04:47:09.833496', '2026-08-29 04:47:09.833496', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (14, 'Đơn bị hủy do hết vé', 'ORDER_CANCELLED_OUT_OF_STOCK', 'Khiếu nại khi đơn hàng bị hủy do sự cố kho hết vé và không còn vé thay thế', 5, 'ORDER', 4, true, '2026-08-29 04:47:09.919453', '2026-08-29 04:47:09.919453', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (16, 'Nhân viên xử lý trả thưởng quá lâu', 'PRIZE_PAYOUT_SLOW_PROCESSING', 'Khiếu nại khi yêu cầu trả thưởng bị treo quá thời gian cam kết xử lý', 1, 'PRIZE_CLAIM', 7, true, '2026-08-29 04:47:10.473284', '2026-08-29 04:47:10.473284', 'SYSTEM', 'SYSTEM');
INSERT INTO public.ticket_categories VALUES (17, 'Khiếu nại trả thưởng đã chuyển', 'PRIZE_PAYOUT_PAID_ISSUE', 'Khiếu nại về số tiền sai, thiếu chuyển, lỗi chuyển khoản hoặc chưa nhận được tiền sau khi đã hoàn tất trả thưởng', 1, 'PRIZE_CLAIM', 7, true, '2026-08-29 04:47:10.473284', '2026-08-29 04:47:10.473284', 'SYSTEM', 'SYSTEM');


--
-- Name: ticket_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ticket_categories_id_seq', 17, true);


--
-- PostgreSQL database dump complete
--
