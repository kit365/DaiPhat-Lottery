"use client";

import { useState } from 'react';
import { TimePicker, TimePickerProps } from '@mui/x-date-pickers/TimePicker';
import { Dayjs } from 'dayjs';

export const AdminTimePicker = (props: TimePickerProps<any>) => {
    const [open, setOpen] = useState(false);

    return (
        <TimePicker
            {...props}
            open={open}
            onOpen={() => {
                setOpen(true);
                props.onOpen?.();
            }}
            onClose={() => {
                setOpen(false);
                props.onClose?.();
            }}
            slotProps={{
                ...props.slotProps,
                textField: {
                    ...props.slotProps?.textField,
                    focused: open || undefined,
                } as any,
            }}
        />
    );
};
