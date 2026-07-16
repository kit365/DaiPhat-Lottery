import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    ChatSocketMessageEvent,
    ChatSocketMessagePayload,
    WebSocketSubscription,
} from '../../types/websocket.type';
import { ChatConversationSocketEvent } from '../../types/chat.type';
import {
    DEFAULT_WS_SERVER_URL,
    HEARTBEAT_MS,
    RECONNECT_DELAY_MS,
    WS_CHAT_OPERATORS_TOPIC,
    WS_CHAT_SEND_DESTINATION,
    WS_USER_CHAT_INBOX_QUEUE,
    WS_ENDPOINT_PATH,
    getConversationTopic,
} from './websocket.constants';

type ConnectionListener = (connected: boolean) => void;

interface ManagedSubscription {
    destination: string;
    callback: (message: IMessage) => void;
    activeSubscription: StompSubscription | null;
}

export const isChatConversationSocketEvent = (
    payload: unknown
): payload is ChatConversationSocketEvent =>
    typeof payload === 'object' &&
    payload != null &&
    'eventType' in payload &&
    'conversationId' in payload &&
    typeof (payload as ChatConversationSocketEvent).eventType === 'string';

class WebSocketService {
    private client: Client | null = null;
    private clientToken: string | null = null;
    private connected = false;
    private connectPromise: Promise<void> | null = null;
    private rejectConnect: ((reason?: unknown) => void) | null = null;
    private listeners = new Set<ConnectionListener>();
    private subscriptions = new Map<number, ManagedSubscription>();
    private nextSubscriptionId = 1;

    constructor() {
        useAuthStore.subscribe((state, previousState) => {
            if (state.token === previousState.token) {
                return;
            }

            if (!state.token) {
                this.disconnect();
                return;
            }

            if (this.client) {
                void this.connect().catch(() => undefined);
            }
        });
    }

    async connect(): Promise<void> {
        const token = useAuthStore.getState().token;
        if (!token) {
            throw new Error('Thiếu access token để kết nối WebSocket.');
        }

        if (this.connected && this.clientToken === token) {
            return;
        }

        if (this.connectPromise && this.clientToken === token) {
            return this.connectPromise;
        }

        if (this.client) {
            this.stopClient(false);
        }

        const client = this.createClient(token);
        this.client = client;
        this.clientToken = token;
        this.connectPromise = new Promise<void>((resolve, reject) => {
            this.rejectConnect = reject;

            client.onConnect = () => {
                if (this.client !== client) {
                    return;
                }
                this.connected = true;
                this.connectPromise = null;
                this.rejectConnect = null;
                this.restoreSubscriptions();
                this.emitConnectionState(true);
                resolve();
            };

            client.onStompError = (frame) => {
                if (this.client !== client) {
                    return;
                }
                this.connected = false;
                this.connectPromise = null;
                this.rejectConnect = null;
                this.emitConnectionState(false);
                reject(new Error(frame.headers['message'] || 'STOMP connection failed.'));
            };

            client.onWebSocketClose = () => {
                if (this.client !== client) {
                    return;
                }
                this.connected = false;
                this.connectPromise = null;
                this.rejectConnect = null;
                this.clearActiveSubscriptions();
                this.emitConnectionState(false);
            };

            client.onWebSocketError = () => {
                if (this.client !== client) {
                    return;
                }
                this.connected = false;
                this.emitConnectionState(false);
            };

            client.activate();
        });

        return this.connectPromise;
    }

    disconnect(): void {
        this.stopClient(true);
    }

    isConnected(): boolean {
        return this.connected;
    }

    addConnectionListener(listener: ConnectionListener): () => void {
        this.listeners.add(listener);
        listener(this.connected);
        return () => {
            this.listeners.delete(listener);
        };
    }

    async subscribe<T>(destination: string, callback: (payload: T) => void): Promise<WebSocketSubscription> {
        await this.connect();

        if (!this.client || !this.connected) {
            throw new Error('WebSocket chưa sẵn sàng để subscribe.');
        }

        const id = this.nextSubscriptionId++;
        const managedSubscription: ManagedSubscription = {
            destination,
            callback: (message) => callback(this.parseBody<T>(message)),
            activeSubscription: null,
        };
        this.subscriptions.set(id, managedSubscription);
        this.activateSubscription(managedSubscription);

        return {
            unsubscribe: () => {
                const current = this.subscriptions.get(id);
                current?.activeSubscription?.unsubscribe();
                this.subscriptions.delete(id);
            },
        };
    }

    async publish(destination: string, body: unknown): Promise<void> {
        await this.connect();

        if (!this.client || !this.connected) {
            throw new Error('WebSocket chưa sẵn sàng để publish.');
        }

        this.client.publish({
            destination,
            body: JSON.stringify(body),
        });
    }

    async subscribeConversation(
        conversationId: number,
        callback: (payload: ChatSocketMessageEvent | ChatConversationSocketEvent) => void
    ): Promise<WebSocketSubscription> {
        return this.subscribe<ChatSocketMessageEvent | ChatConversationSocketEvent>(
            getConversationTopic(conversationId),
            callback
        );
    }

    async subscribeCustomerInbox(
        callback: (payload: ChatSocketMessageEvent | ChatConversationSocketEvent) => void
    ): Promise<WebSocketSubscription> {
        return this.subscribe<ChatSocketMessageEvent | ChatConversationSocketEvent>(
            WS_USER_CHAT_INBOX_QUEUE,
            callback
        );
    }

    async subscribeOperators(
        callback: (payload: ChatConversationSocketEvent) => void
    ): Promise<WebSocketSubscription> {
        return this.subscribe<ChatConversationSocketEvent>(WS_CHAT_OPERATORS_TOPIC, callback);
    }

    async sendChatMessage(payload: ChatSocketMessagePayload): Promise<void> {
        await this.publish(WS_CHAT_SEND_DESTINATION, payload);
    }

    private createClient(token: string): Client {
        return new Client({
            reconnectDelay: RECONNECT_DELAY_MS,
            heartbeatIncoming: HEARTBEAT_MS,
            heartbeatOutgoing: HEARTBEAT_MS,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            webSocketFactory: () => {
                const endpoint = this.resolveEndpoint();
                return new SockJS(`${endpoint}?token=${token}`);
            },
            debug: () => undefined,
        });
    }

    private stopClient(clearSubscriptions: boolean): void {
        const client = this.client;
        this.client = null;
        this.clientToken = null;
        this.connected = false;
        this.connectPromise = null;
        this.rejectConnect?.(new Error('WebSocket connection replaced.'));
        this.rejectConnect = null;
        this.clearActiveSubscriptions();
        if (clearSubscriptions) {
            this.subscriptions.clear();
        }
        this.emitConnectionState(false);
        void client?.deactivate();
    }

    private activateSubscription(subscription: ManagedSubscription): void {
        if (!this.client || !this.connected) {
            return;
        }
        subscription.activeSubscription = this.client.subscribe(
            subscription.destination,
            subscription.callback
        );
    }

    private restoreSubscriptions(): void {
        this.subscriptions.forEach((subscription) => this.activateSubscription(subscription));
    }

    private clearActiveSubscriptions(): void {
        this.subscriptions.forEach((subscription) => {
            subscription.activeSubscription = null;
        });
    }

    private resolveEndpoint(): string {
        const configuredBaseUrl = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_WS_SERVER_URL;
        const normalizedBaseUrl = configuredBaseUrl.endsWith('/')
            ? configuredBaseUrl.slice(0, -1)
            : configuredBaseUrl;
        return `${normalizedBaseUrl}${WS_ENDPOINT_PATH}`;
    }

    private emitConnectionState(connected: boolean): void {
        this.listeners.forEach((listener) => listener(connected));
    }

    private parseBody<T>(message: IMessage): T {
        return JSON.parse(message.body) as T;
    }
}

export const websocketService = new WebSocketService();
