"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { websocketService } from '../../services/websocket/websocket.service';

const SocketContext = createContext(websocketService);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (!token) {
            websocketService.disconnect();
            return;
        }

        websocketService.connect().catch(() => undefined);

        return () => {
            if (!useAuthStore.getState().token) {
                websocketService.disconnect();
            }
        };
    }, [token]);

    return (
        <SocketContext.Provider value={websocketService}>
            {children}
        </SocketContext.Provider>
    );
};
