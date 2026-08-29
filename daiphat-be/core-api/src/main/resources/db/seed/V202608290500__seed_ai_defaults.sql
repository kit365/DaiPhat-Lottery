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
-- Data for Name: ai_service_configs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ai_service_configs VALUES (1, 'CHATBOT', 'Default chatbot runtime configuration for intent routing, fallback behavior, and schedule matching.', false, 0.85, true, '2026-08-29 04:47:09.54965', '2026-08-29 04:47:09.54965', 'SYSTEM', 'SYSTEM', NULL);


--
-- Data for Name: ai_intent_configs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ai_intent_configs VALUES (1, 1, 'ESCALATE_REQUEST', 'Immediate escalation intent when the customer asks for a human operator or cannot continue with the bot.', true, 10, true, '{"defaultConfidence": 0.95}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (2, 1, 'WEB_ACCOUNT', 'Account and profile support intent such as login, registration, password, profile, and order/account lookup.', true, 20, false, '{"defaultConfidence": 0.92}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (3, 1, 'WEB_SCHEDULE', 'Lottery draw schedule intent with slot-answer support, station fuzzy matching, and entity-aware confidence thresholds.', true, 30, false, '{"slotAnswerConfidence": 0.76, "withEntityConfidence": 0.88, "withoutEntityConfidence": 0.75, "stationFuzzyAmbiguityGap": 0.10, "stationFuzzyMatchThreshold": 0.75}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (4, 1, 'WEB_RESULT', 'Lottery result lookup intent with separate confidence for cases with and without an extracted ticket number.', true, 40, false, '{"withTicketConfidence": 0.85, "withoutTicketConfidence": 0.70}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (5, 1, 'OTHER_KNOWLEDGE', 'Reference-only knowledge intent for fortune, dream interpretation, and other non-transactional knowledge questions.', true, 50, false, '{"defaultConfidence": 0.82}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (6, 1, 'TRASH_TALK', 'Low-value conversational or playful messages that should receive a light non-business response.', true, 60, false, '{"defaultConfidence": 0.90}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (7, 1, 'WEB_SEARCH', 'Find available lottery tickets in inventory by number fragment or station.', true, 70, false, '{"defaultConfidence": 0.88}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (8, 1, 'WEB_SUGGEST', 'Suggest available lottery tickets currently for sale from inventory.', true, 80, false, '{"defaultConfidence": 0.85}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (9, 1, 'WEB_SUPPORT', 'Reserved intent for future customer support triage flows beyond the current chatbot scope.', true, 90, false, '{"defaultConfidence": 0.70}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (10, 1, 'SYSTEM_ATTACK', 'Reserved guardrail intent for hostile or prompt-attack style inputs that may require dedicated handling later.', true, 100, false, '{"defaultConfidence": 0.70}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);
INSERT INTO public.ai_intent_configs VALUES (11, 1, 'UNKNOWN', 'Fallback intent when no confident business intent can be determined from the customer message.', true, 999, false, '{"defaultConfidence": 0.30}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL);


--
-- Data for Name: ai_model_registry; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ai_model_registry VALUES (1, 'groq', 'qwen/qwen3.6-27b', 'Groq Qwen 3.6 27B Vision', true, true, 'Default ticket-vision engine (GROQ_VISION_MODEL).', '2026-08-29 04:47:15.913355', '2026-08-29 04:47:15.913355', 'SYSTEM', 'SYSTEM', NULL);


--
-- Name: ai_intent_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_intent_configs_id_seq', 11, true);


--
-- Name: ai_model_registry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_model_registry_id_seq', 1, true);


--
-- Name: ai_service_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_service_configs_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--
