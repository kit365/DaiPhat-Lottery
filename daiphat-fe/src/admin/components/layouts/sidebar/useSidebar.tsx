"use client";

//State thu/phóng sidebar admin (`isOpen`).
import { createContext, useContext, useState, type ReactNode } from "react";

interface SidebarContextType {
    isOpen: boolean;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleSidebar = () => {
        setIsOpen((prev) => !prev);
    };

    return (
        <SidebarContext.Provider value={{ isOpen, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(SidebarContext);

    if (!context) {
        throw new Error("useSidebar must be used within SidebarProvider");
    }

    return context;
};
