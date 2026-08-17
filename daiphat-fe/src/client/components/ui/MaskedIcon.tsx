type MaskedIconProps = {
    src: string;
    className?: string;
    size?: number;
};

/** SVG icon via CSS mask — inherits `color` from parent/currentColor. */
export const MaskedIcon = ({ src, className = '', size = 24 }: MaskedIconProps) => (
    <span
        className={`inline-flex shrink-0 bg-current ${className}`}
        style={{
            width: size,
            height: size,
            WebkitMask: `url(${src}) center / contain no-repeat`,
            mask: `url(${src}) center / contain no-repeat`,
        }}
        aria-hidden
    />
);
