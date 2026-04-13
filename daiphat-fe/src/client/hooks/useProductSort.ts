// useProductSort.ts
import { useState, useEffect, useRef } from "react";

type OptionType = {
    value: string;
    label: string;
};

// Tạo regex search không dấu
const normalize = (str: string) =>
    str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

export const useProductSort = (options: OptionType[], initialValue?: OptionType) => {
    const [selectedOption, setSelectedOption] = useState<OptionType>(initialValue || options[0]);
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    // Search options
    const filteredOptions = options.filter((opt) =>
        normalize(opt.label).includes(normalize(searchValue))
    );

    const handleSelectChange = (option: OptionType) => {
        setSelectedOption(option);
        setMenuOpen(false);
        setSearchValue("");
    };

    const toggleMenu = () => setMenuOpen((prev) => !prev);

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return {
        selectedOption,
        hoveredOption,
        setHoveredOption,
        searchValue,
        setSearchValue,
        menuOpen,
        selectRef,
        filteredOptions,
        handleSelectChange,
        toggleMenu,
    };
};