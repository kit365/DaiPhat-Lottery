/** Debounce before persisting unsaved rows to localStorage. */
export const IMPORT_LINE_DRAFT_AUTOSAVE_MS = 400;

/** Debounce before auto-saving pending tickets to the server. */
export const IMPORT_LINE_DB_AUTOSAVE_DEBOUNCE_MS = 2500;

/** Auto-save immediately when this many pending serials are filled. */
export const IMPORT_LINE_DB_AUTOSAVE_SERIAL_THRESHOLD = 20;
