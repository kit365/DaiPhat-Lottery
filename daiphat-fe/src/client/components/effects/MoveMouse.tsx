import { useEffect, useRef, type ReactNode } from "react";

interface MoveMouseProps {
    depth?: number;
    speed?: number;
    children: ReactNode;
}

export default function MoveMouse({
    depth = 0.7,
    speed = 0.1,
    children,
}: MoveMouseProps) {
    const layerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;

        const handleMouseMove = (e: MouseEvent) => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            const mouseX = e.clientX - centerX;
            const mouseY = e.clientY - centerY;

            const moveX = -(mouseX * depth);
            const moveY = -(mouseY * depth);

            layer.style.transition = `transform ${speed}s ease-out`;

            layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0px)`;
            layer.style.transformStyle = "preserve-3d";
            layer.style.backfaceVisibility = "hidden";
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [depth, speed]);

    return (
        <div
            ref={layerRef}
            style={{
                display: "block",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                willChange: "transform",
            }}
        >
            {children}
        </div>
    );
}
