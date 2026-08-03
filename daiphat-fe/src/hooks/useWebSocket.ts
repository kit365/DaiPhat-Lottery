"use client";

import { useCallback, useEffect, useState } from 'react';
import { websocketService } from '../services/websocket/websocket.service';
import { WebSocketSubscription } from '../types/websocket.type';

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(websocketService.isConnected());

    useEffect(() => websocketService.addConnectionListener(setIsConnected), []);

    const connect = useCallback(async () => {
        await websocketService.connect();
    }, []);

    const disconnect = useCallback(() => {
        websocketService.disconnect();
    }, []);

    const subscribe = useCallback(
        async <T,>(destination: string, callback: (payload: T) => void): Promise<WebSocketSubscription> => {
            return websocketService.subscribe<T>(destination, callback);
        },
        []
    );

    const publish = useCallback(async (destination: string, body: unknown) => {
        await websocketService.publish(destination, body);
    }, []);

    return {
        isConnected,
        connect,
        disconnect,
        subscribe,
        publish,
        socketService: websocketService,
    };
};
