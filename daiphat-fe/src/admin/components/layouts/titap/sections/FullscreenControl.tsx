"use client";

import { memo } from "react";
import { FullscreenIcon, UnFullscreenIcon } from "../../../../assets/icons";
import { ButtonTiptap } from "./ButtonTiptap";
import { useTranslation } from "react-i18next";

interface FullscreenControlProps {
    isFullscreen: boolean;
    onToggle: () => void;
}

export const FullscreenControl = memo(({ isFullscreen, onToggle }: FullscreenControlProps) => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-1">
            <ButtonTiptap
                title={isFullscreen ? t("admin.tiptap.toolbar.exit_fullscreen") : t("admin.tiptap.toolbar.fullscreen")}
                onClick={onToggle}
                active={isFullscreen}
            >
                {isFullscreen ? <UnFullscreenIcon /> : <FullscreenIcon />}
            </ButtonTiptap>
        </div>
    );
});

FullscreenControl.displayName = 'FullscreenControl';
