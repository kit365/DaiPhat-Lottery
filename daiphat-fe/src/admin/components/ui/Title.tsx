import { Typography } from "@mui/material";

type TitleProps = {
    title: string;
    disableBottomMargin?: boolean;
};

export const Title = ({ title, disableBottomMargin = false }: TitleProps) => {
    return (
        <Typography
            variant="h6"
            component="h1"
            sx={{
                fontSize: '1.4375rem',
                fontWeight: 700,
                mb: disableBottomMargin ? 0 : '16px',
            }}
        >
            {title}
        </Typography>
    );
};
