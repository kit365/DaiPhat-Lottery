export const STATION_COLORS = [
    '#1976d2', // Blue
    '#388e3c', // Green
    '#d32f2f', // Red
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#00796b', // Teal
    '#c2185b', // Pink
    '#5d4037', // Brown
    '#0288d1', // Light Blue
    '#afb42b', // Lime
    '#e64a19', // Deep Orange
    '#455a64', // Blue Grey
    '#512da8', // Deep Purple
    '#0097a7', // Cyan
    '#689f38', // Light Green
    '#fbc02d', // Yellow
];

export const getStationColor = (stationId?: number | string | null): string => {
    if (!stationId) return '#757575'; // Default grey for unknown or ALL
    const id = typeof stationId === 'string' ? parseInt(stationId, 10) : stationId;
    if (isNaN(id)) return '#757575';
    
    // Use modulo to pick a consistent color from the palette
    const index = (id * 7) % STATION_COLORS.length; // Multiply by a prime to scramble a bit
    return STATION_COLORS[index];
};
