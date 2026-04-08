import { useEffect, useState } from "react";

export const useScrollVisibility = (threshold: number = 200) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            setVisible(window.scrollY > threshold);
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, [threshold]);

    return visible;
};
