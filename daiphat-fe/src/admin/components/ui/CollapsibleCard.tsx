import {
    Box,
    Card,
    CardHeader,
    Collapse,
    Divider,
    IconButton,
    Stack,
} from "@mui/material";
import { ArrowIcon } from "../../assets/icons";

type Props = {
    title: string;
    subheader?: string;
    expanded: boolean;
    onToggle: () => void;
    /** When false, the card is always expanded and the toggle is hidden. */
    collapsible?: boolean;
    extraAction?: React.ReactNode;
    children: React.ReactNode;
};

export const CollapsibleCard = ({
    title,
    subheader,
    expanded,
    onToggle,
    collapsible = true,
    extraAction,
    children,
}: Props) => {
    const isExpanded = collapsible ? expanded : true;

    return (
        <Card>
            <CardHeader
                title={title}
                subheader={subheader}
                onClick={collapsible ? onToggle : undefined}
                slotProps={{
                    title: { sx: { fontWeight: 700, fontSize: "1.125rem", color: "#0f172a" } },
                    subheader: {
                        sx: { color: "#637381", fontSize: "0.875rem", mt: 0.5 },
                    },
                }}
                action={
                    <Stack direction="row" spacing={1} alignItems="center">
                        {extraAction && (
                            <Box onClick={(e) => e.stopPropagation()}>
                                {extraAction}
                            </Box>
                        )}
                        {collapsible && (
                            <IconButton
                                sx={{
                                    transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                                    transition: "transform 0.3s",
                                }}
                            >
                                <ArrowIcon />
                            </IconButton>
                        )}
                    </Stack>
                }
                sx={{
                    padding: "20px 24px",
                    mb: isExpanded ? 0 : 0,
                    cursor: collapsible ? "pointer" : "default",
                }}
            />

            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                {collapsible ? <Divider sx={{ borderColor: "#919eab33" }} /> : null}
                {children}
            </Collapse>
        </Card>
    );
};
