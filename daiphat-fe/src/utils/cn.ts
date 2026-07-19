type ClassValue = string | number | boolean | undefined | null | ClassValue[];

function toVal(mix: ClassValue): string {
    let str = '';
    if (typeof mix === 'string' || typeof mix === 'number') {
        str += mix;
    } else if (Array.isArray(mix)) {
        for (let k = 0; k < mix.length; k++) {
            const y = toVal(mix[k]);
            if (y) {
                if (str) str += ' ';
                str += y;
            }
        }
    }
    return str;
}

export function cn(...inputs: ClassValue[]): string {
    let str = '';
    for (let i = 0; i < inputs.length; i++) {
        const x = toVal(inputs[i]);
        if (x) {
            if (str) str += ' ';
            str += x;
        }
    }
    return str;
}
