import { useEffect, useState } from "react";
import { IGridSettings } from "../configs/types";

const SETTINGS_DEFAULT: IGridSettings = {
    density: 'standard',
    showCellBorders: true,
    showColumnBorders: true,
};

const SETTINGS_STORAGE_KEY = 'mui-data-grid-settings';

const getInitialSettings = (): IGridSettings => {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return storedSettings ? JSON.parse(storedSettings) : SETTINGS_DEFAULT;
    } catch (error) {
        console.log(error);
        return SETTINGS_DEFAULT;
    }
};

export const useSettings = () => {
    const [settings, setSettings] = useState<IGridSettings>(getInitialSettings());

    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    return {
        settings,
        setSettings,
    };
};



