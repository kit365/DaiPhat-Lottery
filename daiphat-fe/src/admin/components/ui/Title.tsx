import { Typography } from "@mui/material";

type TitleProps = {
    title: string;
};

export const Title = ({ title }: TitleProps) => {
    return (
        <Typography variant="h6" sx={{ fontSize: '1.4375rem', fontWeight: 700, mb: '16px' }}>
            {title}
        </Typography>
    );
};
