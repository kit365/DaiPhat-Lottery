import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    ChatSocketMessageEvent,
    ChatSocketMessagePayload,
    WebSocketSubscription,
} from '../../types/websocket.type';
import {
    DEFAULT_WS_SERVER_URL,
    HEARTBEAT_MS,
    RECONNECT_DELAY_MS,
    WS_CHAT_SEND_DESTINATION,
    WS_ENDPOINT_PATH,
    getConversationTopic,
} from './websocket.constants';

type ConnectionListener = (connected: boolean) => void;

class WebSocketService {
    private client: Client | null = null;
    private connected = false;
    private connectPromise: Promise<void> | null = null;
    private listeners = new Set<ConnectionListener>();

    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        if (this.connectPromise) {
            return this.connectPromise;
        }

        const token = useAuthStore.getState().token;
        if (!token) {
            throw new Error('Thiếu access token để kết nối WebSocket.');
        }

        this.client = this.createClient(token);
        this.connectPromise = new Promise<void>((resolve, reject) => {
            if (!this.client) {
                reject(new Error('Không thể khởi tạo WebSocket client.'));
                return;
            }

            this.client.onConnect = () => {
                this.connected = true;
                this.connectPromise = null;
                this.emitConnectionState(true);
                resolve();
            };

            this.client.onStompError = (frame) => {
                this.connected = false;
                this.connectPromise = null;
                this.emitConnectionState(false);
                reject(new Error(frame.headers['message'] || 'STOMP connection failed.'));
            };

            this.client.onWebSocketClose = () => {
                this.connected = false;
                this.connectPromise = null;
                this.emitConnectionState(false);
            };

            this.client.onWebSocketError = () => {
                this.connected = false;
                this.emitConnectionState(false);
            };

            this.client.activate();
        });

        return this.connectPromise;
    }

    disconnect(): void {
        this.connectPromise = null;
        this.connected = false;
        this.emitConnectionState(false);
        this.client?.deactivate();
        this.client = null;
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

        const subscription: StompSubscription = this.client.subscribe(destination, (message: IMessage) => {
            callback(this.parseBody<T>(message));
        });

        return {
            unsubscribe: () => subscription.unsubscribe(),
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
        callback: (payload: ChatSocketMessageEvent) => void
    ): Promise<WebSocketSubscription> {
        return this.subscribe<ChatSocketMessageEvent>(getConversationTopic(conversationId), callback);
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
