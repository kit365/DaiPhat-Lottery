import {
    Card,
    CardHeader,
    Collapse,
    Divider,
    IconButton,
} from "@mui/material";
import { ArrowIcon } from "../../assets/icons";

type Props = {
    title: string;
    subheader?: string;
    expanded: boolean;
    onToggle: () => void;
    /** When false, the card is always expanded and the toggle is hidden. */
    collapsible?: boolean;
    children: React.ReactNode;
};

export const CollapsibleCard = ({
    title,
    subheader,
    expanded,
    onToggle,
    collapsible = true,
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
                    title: { sx: { fontWeight: 600, fontSize: "1.125rem" } },
                    subheader: {
                        sx: { color: "#637381", fontSize: "0.875rem", mt: 0.5 },
                    },
                }}
                action={
                    collapsible ? (
                        <IconButton
                            sx={{
                                transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                                transition: "transform 0.3s",
                            }}
                        >
                            <ArrowIcon />
                        </IconButton>
                    ) : undefined
                }
                sx={{
                    padding: "24px 24px 0",
                    mb: isExpanded ? "24px" : 0,
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
