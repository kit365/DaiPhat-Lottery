export type HighlightSegment = { text: string; highlighted: boolean };

/** Split a value into plain prefix + highlighted LAST-match suffix for display. */
export function splitLastMatchHighlight(value: string, matchDigits?: number): HighlightSegment[] {
    const digits = matchDigits != null && matchDigits > 0 ? matchDigits : value.length;
    if (value.length <= digits) {
        return [{ text: value, highlighted: true }];
    }
    const head = value.slice(0, value.length - digits);
    const tail = value.slice(value.length - digits);
    return [
        { text: head, highlighted: false },
        { text: tail, highlighted: true },
    ];
}
