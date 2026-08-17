import React from "react";
import { Typography, Stack, Box } from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { PasswordPolicy } from "@/shared/auth/types/auth.type";

interface Props {
    password?: string;
    policy: PasswordPolicy;
}

export const PasswordRequirementList: React.FC<Props> = ({ password, policy }) => {
    const { requirements, minLength, maxLength } = policy;
    const pwd = password || "";

    const items = requirements.map(req => ({
        id: req.id,
        description: req.description,
        isMet: req.regex ? new RegExp(req.regex).test(pwd) : (req.id === 'length-min' ? pwd.length >= minLength : (req.id === 'length-max' ? (pwd.length <= maxLength && pwd.length > 0) : false))
    }));

    return (
        <Stack spacing={1.2} sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'rgba(0, 0, 0, 0.02)', 
            borderRadius: '12px', 
            border: '1px solid rgba(145, 158, 171, 0.12)' 
        }}>
            <Typography variant="caption" sx={{ 
                color: 'text.secondary', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                mb: 0.5, 
                display: 'block', 
                letterSpacing: 0.5,
                fontSize: '0.65rem'
            }}>
                Yêu cầu bảo mật
            </Typography>
            {items.map((item) => (
                <Stack key={item.id} direction="row" spacing={1} alignItems="center">
                    <Icon
                        icon={item.isMet ? "solar:check-circle-bold" : "solar:reorder-circle-bold"}
                        color={item.isMet ? "var(--palette-success-main, #22c55e)" : "rgba(145, 158, 171, 0.3)"}
                        width={16}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: item.isMet ? 'text.primary' : 'text.secondary',
                            fontWeight: item.isMet ? 600 : 400,
                            transition: 'all 0.2s',
                            fontSize: '0.75rem'
                        }}
                    >
                        {item.description}
                    </Typography>
                </Stack>
            ))}
        </Stack>
    );
};
