import Link from "@/admin/components/navigation/AdminLink";
import Breadcrumbs from "@mui/material/Breadcrumbs";

type BreadcrumbItem = {
    label: string;
    to?: string;
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
                        href={item.to}
                        className="text-[0.875rem] text-[#1C252E] hover:underline"
                    >
                        {item.label}
                    </Link>
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
