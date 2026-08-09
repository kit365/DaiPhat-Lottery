import { FormControlLabel, Switch, Typography } from "@mui/material";
import { Control, Controller, FieldValues } from "react-hook-form";
import { Path } from "react-hook-form";

interface SwitchButtonProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    checkedValue?: any;
    uncheckedValue?: any;
}

export const SwitchButton = <T extends FieldValues>({
    control,
    name,
    checkedValue = true,
    uncheckedValue = false
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
                            onChange={(e) => field.onChange(e.target.checked ? checkedValue : uncheckedValue)}
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
