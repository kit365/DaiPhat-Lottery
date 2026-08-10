import Link from "@/admin/components/navigation/AdminLink";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import { Typography } from "@mui/material";

export type BreadcrumbItem = {
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
                    <Typography
                        key={index}
                        component={Link}
                        href={item.to}
                        sx={{ fontSize: '0.875rem', color: '#1C252E', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                        {item.label}
                    </Typography>
                ) : item.onClick ? (
                    <Typography
                        key={index}
                        onClick={item.onClick}
                        sx={{ fontSize: '0.875rem', color: '#1C252E', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    >
                        {item.label}
                    </Typography>
                ) : (
                    <Typography
                        key={index}
                        sx={{ fontSize: '0.875rem', color: '#637381', cursor: 'default' }}
                    >
                        {item.label}
                    </Typography>
                )
            )}
        </Breadcrumbs>
    );
};
