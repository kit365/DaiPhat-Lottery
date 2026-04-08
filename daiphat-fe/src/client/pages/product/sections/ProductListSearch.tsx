import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useProductSort } from '../../../hooks/useProductSort';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

type OptionType = {
    value: string;
    label: string;
};

const options: OptionType[] = [
    { value: 'position:desc', label: 'Sắp xếp mặc định' },
    { value: 'createdAt:desc', label: 'Sản phẩm mới nhất' },
    { value: 'priceNew:asc', label: 'Giá: thấp đến cao' },
    { value: 'priceNew:desc', label: 'Giá: cao đến thấp' },
];

export const ProductListSearch = ({ totalItems = 0, currentLimit = 9, currentPage = 1 }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Tìm option đang được chọn từ URL
    const currentSort = `${searchParams.get("sortKey") || "position"}:${searchParams.get("sortValue") || "desc"}`;
    const initialOption = options.find(opt => opt.value === currentSort) || options[0];

    const {
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
    } = useProductSort(options, initialOption);

    // Khi chọn option mới, cập nhật URL
    useEffect(() => {
        if (selectedOption && selectedOption.value !== currentSort) {
            const [key, val] = selectedOption.value.split(":");
            searchParams.set("sortKey", key);
            searchParams.set("sortValue", val);
            searchParams.set("page", "1");
            setSearchParams(searchParams);
        }
    }, [selectedOption]);

    const start = (currentPage - 1) * currentLimit + 1;
    const end = Math.min(currentPage * currentLimit, totalItems);

    return (
        <>
            {/* Search */}
            <div className="px-[30px] py-[15px] mb-[40px] flex items-center justify-between bg-[#e67e201a] rounded-[192px]">
                <div className="text-client-secondary">
                    {totalItems > 0 ? `Hiển thị ${start}–${end} trong số ${totalItems} kết quả` : 'Không có kết quả nào'}
                </div>
                <div className="flex items-center">
                    <div
                        className="text-client-secondary relative cursor-pointer px-[15px] h-[55px] bg-white border border-[#aaa] flex items-center rounded-[40px] ml-[20px]"
                        onClick={() => {
                            toggleMenu();
                        }}
                        ref={selectRef}
                    >
                        {selectedOption?.label}
                        <ArrowDropDownIcon style={{
                            width: "20px",
                            height: "20px",
                            cursor: "pointer",
                            marginLeft: "15px",
                            transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }} />
                        {menuOpen && (
                            <div className="absolute z-20 bg-white left-0 top-[100%] w-full rounded-[10px] mt-[10px] border border-[#10293726] shadow-[0_4px_5px_#10293726,0_-1px_0_0_#10293726]">
                                <div
                                    className="p-[10px]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-[32px] py-[16px] border border-[#10293726] rounded-[40px]">
                                        <input
                                            type="text"
                                            className="w-full outline-none text-client-text"
                                            value={searchValue}
                                            onChange={(e) => setSearchValue(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <ul className="p-[10px] pt-0 max-h-[200px] overflow-auto">
                                    {filteredOptions.length > 0 ? (
                                        filteredOptions.map((item) => (
                                            <li
                                                key={item.value}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectChange(item);
                                                }}
                                                onMouseEnter={() => setHoveredOption(item.value)}
                                                onMouseLeave={() => setHoveredOption(null)}
                                                className={`px-[10px] py-[8px] mt-[1px] rounded-[5px] transition-all cursor-pointer 
                    ${item.value === selectedOption.value
                                                        ? hoveredOption === item.value
                                                            ? "bg-[#DDDDDD] text-white"
                                                            : "bg-client-secondary text-white"
                                                        : hoveredOption === item.value
                                                            ? "bg-client-secondary text-white"
                                                            : "text-client-secondary hover:bg-client-secondary hover:text-white"
                                                    }`}
                                            >
                                                {item.label}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="px-[10px] py-[8px] text-[#999] text-center">
                                            Không có kết quả
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}