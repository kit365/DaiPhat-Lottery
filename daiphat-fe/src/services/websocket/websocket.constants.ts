import { API_PREFIX, API_VERSION } from '../../api/api.constants';

export const DEFAULT_WS_SERVER_URL = 'http://localhost:8080';
export const RECONNECT_DELAY_MS = 5000;
export const HEARTBEAT_MS = 10000;
export const WS_ENDPOINT_PATH = `${API_PREFIX}${API_VERSION}/ws`;

export const WS_APP_PREFIX = '/app';
export const WS_TOPIC_PREFIX = '/topic';
export const WS_QUEUE_PREFIX = '/queue';
export const WS_USER_PREFIX = '/user';

export const WS_CHAT_SEGMENT = '/chat';
export const WS_CONVERSATIONS_SEGMENT = '/conversations';
export const WS_SEND_SEGMENT = '/send';
export const WS_OVERRUN_ALERTS_SEGMENT = '/overrun-alerts';

export const WS_CHAT_SEND_DESTINATION = `${WS_APP_PREFIX}${WS_CHAT_SEGMENT}${WS_SEND_SEGMENT}`;
export const WS_CHAT_OPERATORS_TOPIC = `${WS_TOPIC_PREFIX}${WS_CHAT_SEGMENT}/operators`;
export const WS_USER_CHAT_INBOX_QUEUE = `${WS_USER_PREFIX}${WS_QUEUE_PREFIX}${WS_CHAT_SEGMENT}/inbox`;
export const WS_USER_OVERRUN_ALERTS_QUEUE = `${WS_USER_PREFIX}${WS_QUEUE_PREFIX}${WS_OVERRUN_ALERTS_SEGMENT}`;

export const getConversationTopic = (conversationId: number): string =>
    `${WS_TOPIC_PREFIX}${WS_CHAT_SEGMENT}${WS_CONVERSATIONS_SEGMENT}/${conversationId}`;
