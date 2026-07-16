import { useEffect, useState } from 'react';
import type { GridDensity } from '@mui/x-data-grid';

export interface PrizeStructureGridSettings {
    density?: GridDensity;
    showCellBorders: boolean;
    showColumnBorders: boolean;
}

const STORAGE_KEY = 'prize-structure-grid-settings-v2';

const DEFAULT_SETTINGS: PrizeStructureGridSettings = {
    density: 'standard',
    showCellBorders: false,
    showColumnBorders: false,
};

const getInitialSettings = (): PrizeStructureGridSettings => {
    try {
        const storedSettings = localStorage.getItem(STORAGE_KEY);
        return storedSettings
            ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) }
            : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export const usePrizeStructureGridSettings = () => {
    const [settings, setSettings] = useState<PrizeStructureGridSettings>(getInitialSettings);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    return { settings, setSettings };
};
