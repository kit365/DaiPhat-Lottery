import { Link } from "react-router-dom";
import Breadcrumbs from "@mui/material/Breadcrumbs";

type BreadcrumbItem = {
    label: string;
    to?: string;
    onClick?: () => void;
};

type BreadcrumbProps = {
    items: BreadcrumbItem[];
};

export const Breadcrumb = ({ items }: BreadcrumbProps) => {
    return (
        <Breadcrumbs
            separator={
                <span
                    style={{
                        width: "4px",
                        height: "4px",
                        backgroundColor: "#919EAB",
                        borderRadius: "50%",
                        margin: "0 8px"
                    }}
                />
            }
            aria-label="breadcrumb"
        >
            {items.map((item, index) =>
                item.to ? (
                    <Link
                        key={index}
                        to={item.to}
                        className="text-[0.875rem] text-[#1C252E] hover:underline"
                    >
                        {item.label}
                    </Link>
                ) : item.onClick ? (
                    <span
                        key={index}
                        onClick={item.onClick}
                        className="text-[0.875rem] text-[#1C252E] hover:underline cursor-pointer"
                    >
                        {item.label}
                    </span>
                ) : (
                    <span
                        key={index}
                        className="text-[0.875rem] text-[#637381] cursor-default"
                    >
                        {item.label}
                    </span>
                )
            )}
        </Breadcrumbs>
    );
};
