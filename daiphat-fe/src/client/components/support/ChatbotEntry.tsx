"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

const ChatbotPopup = dynamic(
    () => import("./ChatbotPopup").then((mod) => mod.ChatbotPopup),
    { ssr: false },
);

/**
 * Lightweight shell: chỉ mount ChatbotPopup (chunk nặng) sau lần tương tác đầu.
 * Hover FAB = prefetch chunk; click = navigate như hiện tại.
 */
export function ChatbotEntry() {
    const router = useRouter();
    const token = useAuthStore((state) => state.token);
    const [activated, setActivated] = useState(false);

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
                    setActivated(true);
                    router.push("/profile/complaints");
                }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] rounded-full flex items-center justify-center shadow-2xl hover:shadow-[#df1b1c]/50 hover:scale-110 transition-all duration-300 z-50 group"
                aria-label="Mở trang khiếu nại"
            >
                <MessageCircle className="w-7 h-7 text-white group-hover:animate-pulse" />
            </button>
        );
    }

    return <ChatbotPopup />;
}
