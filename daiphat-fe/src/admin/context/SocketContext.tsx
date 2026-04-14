import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        // Disabled for Static Mockup
        /*
        const newSocket = io('http://localhost:8080', {
            withCredentials: true
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server (Admin)');
        });

        newSocket.on('overrun-alert', () => {
            console.log('Overrun alert received, invalidating notifications...');
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        });

        return () => {
            newSocket.disconnect();
        };
        */
       return () => {};
    }, [queryClient]);


    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
