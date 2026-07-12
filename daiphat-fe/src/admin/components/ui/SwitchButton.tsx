import { FormControlLabel, Switch, Typography } from "@mui/material";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

interface SwitchButtonProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    checkedValue?: any;
    uncheckedValue?: any;
    /** Return false to prevent switching to the requested state. */
    onBeforeChange?: (nextChecked: boolean) => boolean;
}

export const SwitchButton = <T extends FieldValues>({
    control,
    name,
    checkedValue = true,
    uncheckedValue = false,
    onBeforeChange,
}: SwitchButtonProps<T>) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <FormControlLabel
                    sx={{
                        pl: "24px",
                        ml: "-11px",
                        mr: "16px",
                        flexGrow: "1",
                    }}
                    control={
                        <Switch
                            {...field}
                            checked={field.value === checkedValue}
                            onChange={(e) => {
                                const nextChecked = e.target.checked;
                                if (onBeforeChange && !onBeforeChange(nextChecked)) {
                                    return;
                                }
                                field.onChange(nextChecked ? checkedValue : uncheckedValue);
                            }}
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#00A76F',
                                    transform: "translateX(14px)",
                                    '& + .MuiSwitch-track': {
                                        backgroundColor: '#00A76F',
                                        opacity: 1,
                                    },
                                },
                                '& .MuiSwitch-switchBase': {
                                    top: "6px",
                                    left: "6px"
                                },
                                '& .MuiSwitch-thumb': {
                                    boxShadow: "0px 2px 1px -1px rgba(145 158 171 / 20%),0px 1px 1px 0px rgba(145 158 171 / 14%),0px 1px 3px 0px rgba(145 158 171 / 12%)",
                                    backgroundColor: "#fff",
                                    width: "0.875rem",
                                    height: "0.875rem",
                                },
                                '& .MuiSwitch-track': {
                                    height: "20px",
                                    borderRadius: "10px",
                                    backgroundColor: "#919eab7a",
                                    opacity: "1"
                                }
                            }}
                        />
                    }
                    label={
                        <Typography variant="body1" sx={{ fontSize: "0.875rem", color: "#1C252E", mt: "5px" }}>
                            {field.value === checkedValue ? 'Hoạt động' : 'Dừng hoạt động'}
                        </Typography>
                    }
                    labelPlacement="end"
                />
            )}
        />
    );
};
