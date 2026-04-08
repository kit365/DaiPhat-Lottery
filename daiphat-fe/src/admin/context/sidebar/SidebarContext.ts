import { createContext } from 'react';

export interface SidebarContextType {
    isOpen: boolean;
    toggleSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(
    undefined
);