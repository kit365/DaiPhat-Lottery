import { useState, ReactNode } from 'react';
import { SidebarContext } from './SidebarContext';

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleSidebar = () => {
        setIsOpen(prev => !prev);
    };

    return (
        <SidebarContext.Provider value={{ isOpen, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
};
