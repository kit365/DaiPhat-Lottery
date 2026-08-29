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
-- Data for Name: lottery_regions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.lottery_regions VALUES (1, 'MIEN_NAM', 'Miền Nam', 'TRADITIONAL', 0, 999999, 0, '16:15:00', '2026-08-29 04:47:09.546675', '2026-08-29 04:47:09.546675', 'SYSTEM', 'SYSTEM');
INSERT INTO public.lottery_regions VALUES (2, 'MIEN_TRUNG', 'Miền Trung', 'TRADITIONAL', 0, 999999, 0, '17:15:00', '2026-08-29 04:47:09.546675', '2026-08-29 04:47:09.546675', 'SYSTEM', 'SYSTEM');
INSERT INTO public.lottery_regions VALUES (3, 'MIEN_BAC', 'Miền Bắc', 'TRADITIONAL', 0, 99999, 0, '18:15:00', '2026-08-29 04:47:09.546675', '2026-08-29 04:47:09.546675', 'SYSTEM', 'SYSTEM');


--
-- Name: lottery_regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lottery_regions_id_seq', 3, true);


--
-- PostgreSQL database dump complete
--
