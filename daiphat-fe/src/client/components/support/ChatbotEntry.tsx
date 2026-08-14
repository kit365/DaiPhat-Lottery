"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

const ChatbotPopup = dynamic(
    () => import("./ChatbotPopup").then((mod) => mod.ChatbotPopup),
    { ssr: false },
);

/**
 * Lightweight shell: chỉ mount ChatbotPopup (chunk nặng) sau lần tương tác đầu.
 * Hover/focus = prefetch chunk; click = mở popup chat.
 */
export function ChatbotEntry() {
    const token = useAuthStore((state) => state.token);
    const [activated, setActivated] = useState(false);
    const openOnMountRef = useRef(false);

    if (!token) {
        return null;
    }

    if (!activated) {
        return (
            <button
                type="button"
                onPointerEnter={() => setActivated(true)}
                onFocus={() => setActivated(true)}
                onClick={() => {
                    openOnMountRef.current = true;
                    setActivated(true);
                }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] rounded-full flex items-center justify-center shadow-2xl hover:shadow-[#df1b1c]/50 hover:scale-110 transition-all duration-300 z-50 group"
                aria-label="Mở chat hỗ trợ"
            >
                <MessageCircle className="w-7 h-7 text-white group-hover:animate-pulse" />
            </button>
        );
    }

    return <ChatbotPopup defaultOpen={openOnMountRef.current} />;
}
