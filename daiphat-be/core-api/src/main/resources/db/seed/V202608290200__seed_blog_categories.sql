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
-- Data for Name: blog_category; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.blog_category VALUES (1, NULL, 'Kinh nghiệm chơi số', 'kinh-nghiem-choi-so', 'Chia sẻ kinh nghiệm, bí quyết chơi số hiệu quả', 1, false, 'ACTIVE', 'fa-solid fa-lightbulb', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.blog_category VALUES (2, NULL, 'Soi cầu', 'soi-cau', 'Phân tích soi cầu kết quả hàng ngày', 2, false, 'ACTIVE', 'fa-solid fa-magnifying-glass-chart', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.blog_category VALUES (3, NULL, 'Tin tức', 'tin-tuc', 'Tin tức sự kiện, tin tức xổ số mới nhất', 3, false, 'ACTIVE', 'fa-regular fa-newspaper', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.blog_category VALUES (4, NULL, 'Bài viết nổi bật', 'bai-viet-noi-bat', 'Tổng hợp các bài viết nổi bật được nhiều người đọc', 4, false, 'ACTIVE', 'fa-solid fa-star', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL);


--
-- Name: blog_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blog_category_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--
