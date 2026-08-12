"use client";

import { memo } from "react";
import { FullscreenIcon, UnFullscreenIcon } from "../../../../assets/icons";
import { ButtonTiptap } from "./ButtonTiptap";

interface FullscreenControlProps {
    isFullscreen: boolean;
    onToggle: () => void;
}

export const FullscreenControl = memo(({ isFullscreen, onToggle }: FullscreenControlProps) => {
    return (
        <div className="flex items-center gap-1">
            <ButtonTiptap
                title={isFullscreen ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình'}
                onClick={onToggle}
                active={isFullscreen}
            >
                {isFullscreen ? <UnFullscreenIcon /> : <FullscreenIcon />}
            </ButtonTiptap>
        </div>
    );
});

FullscreenControl.displayName = 'FullscreenControl';
