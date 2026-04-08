import { Link, useLocation, useSearchParams } from "react-router-dom";
import PetsIcon from "@mui/icons-material/Pets";
import { memo } from "react";

interface Category {
    name: string;
    count: number;
    to: string;
}

interface ProductAsideListProps {
    categories: Category[];
}

export const ProductAsideList = memo(({ categories }: ProductAsideListProps) => {
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();

    const checkActive = (to: string) => {
        const url = new URL(to, window.location.origin);
        const itemPath = url.pathname;
        const itemCategory = url.searchParams.get("category");
        const itemBrand = url.searchParams.get("brand");

        if (itemPath !== pathname) return false;

        if (itemCategory) return searchParams.get("category") === itemCategory;
        if (itemBrand) return searchParams.get("brand") === itemBrand;

        return !searchParams.get("category") && !searchParams.get("brand");
    };

    return (
        <ul className="py-[10px]">
            {categories.map((cat) => {
                const isActive = checkActive(cat.to);
                return (
                    <li
                        key={cat.to}
                        className="mb-[10px] flex items-center relative group"
                    >
                        <Link
                            to={cat.to}
                            className={`w-full px-[30px] py-[15px] pr-[60px] rounded-[40px] 
                            flex items-center transition-default 
                            ${isActive
                                    ? "bg-client-primary text-white"
                                    : "bg-[#fff0f066] text-client-secondary group-hover:bg-client-secondary group-hover:text-white"
                                }`}
                        >
                            <PetsIcon sx={{ fontSize: "20px", marginRight: "10px" }} />
                            {cat.name}
                            <span className={`absolute right-[30px] top-[50%] translate-y-[-50%] transition-default ${isActive ? "text-white" : "text-client-text group-hover:text-white"}`}>
                                ({cat.count})
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
});
