import { Button, SvgIcon, Tooltip } from "@mui/material";
import { ColumnsPanelTrigger } from "@mui/x-data-grid";

const CustomViewColumnIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path
            fill="#1C252E"
            fillRule="evenodd"
            d="M15 4H9v16h6zm2 16h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3zM4 4h3v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"
            clipRule="evenodd"
        />
    </SvgIcon>
);

export const Columns = () => {
    return (
        <Tooltip title="Cột">
            <ColumnsPanelTrigger
                render={(props) => (
                    <Button
                        {...props}
                        variant="text"
                        size="small"
                        disableElevation
                        startIcon={<CustomViewColumnIcon />}
                        sx={{
                            textTransform: 'none',
                            minWidth: '64px',
                            minHeight: "30px",
                            fontSize: "0.8125rem",
                            padding: '4px',
                            fontWeight: "700",
                            borderRadius: "8px",
                            gap: "6px",
                            color: '#1C252E',

                            '& .MuiButton-startIcon': {
                                margin: 0
                            },

                            '&:hover': {
                                backgroundColor: '#919eab14',
                            },

                            '& .MuiButton-icon': {
                                mt: "-2px !important"
                            }
                        }}
                    >
                        Cột
                    </Button>
                )}
            />
        </Tooltip>
    );
};
