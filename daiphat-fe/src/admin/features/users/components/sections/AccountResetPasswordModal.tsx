"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    Button,
    Typography,
    Box,
    CircularProgress,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUserDetail, useUserStatuses, useSearchCustomers, useRoles, useStaffByTicketService, useUploadUserAvatar, useDeleteUserAvatar, useChangeUserPassword, useInitiateUserPasswordReset, useConfirmUserPasswordReset } from "../../hooks/useUsers";
import { AppToast as toast } from '../../../../../utils/toast.util';
import { motion, AnimatePresence } from 'framer-motion';

interface AccountResetPasswordModalProps {
    open: boolean;
    onClose: () => void;
    user: { id: string; fullName: string; email: string } | null;
}

const OtpInput = ({ value, onChange, disabled }: { value: string; onChange: (val: string) => void; disabled?: boolean }) => {
    const inputs = useRef<HTMLInputElement[]>([]);

    const handleInput = (e: any, index: number) => {
        const val = e.target.value;
        if (!/^[0-9]$/.test(val) && val !== "") return;

        const newOtp = value.split("");
        newOtp[index] = val;
        onChange(newOtp.join("").slice(0, 6));

        if (val !== "" && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: any, index: number) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").trim();
        if (!/^\d+$/.test(data)) return;

        const pasteData = data.slice(0, 6).split("");
        onChange(pasteData.join(""));

        const nextIndex = Math.min(pasteData.length, 5);
        inputs.current[nextIndex]?.focus();
    };

    return (
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            {[0, 1, 2, 3, 4, 5].map((idx) => (
                <input
                    key={idx}
                    ref={(el: any) => (inputs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={value[idx] || ""}
                    onChange={(e: any) => handleInput(e, idx)}
                    onKeyDown={(e: any) => handleKeyDown(e, idx)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    style={{
                        width: '48px',
                        height: '56px',
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        borderRadius: '12px',
                        border: '2px solid #f1f5f9',
                        backgroundColor: '#f8fafc',
                        outline: 'none',
                        transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                        e.target.style.backgroundColor = 'white';
                        e.target.style.borderColor = '#FF6262';
                        e.target.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.backgroundColor = '#f8fafc';
                        e.target.style.borderColor = '#f1f5f9';
                        e.target.style.boxShadow = 'none';
                    }}
                />
            ))}
        </Box>
    );
};

export const AccountResetPasswordModal = ({ open, onClose, user }: AccountResetPasswordModalProps) => {
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");

    const { mutate: initiateReset, isPending: isInitiating } = useInitiateUserPasswordReset();
    const { mutate: confirmReset, isPending: isConfirming } = useConfirmUserPasswordReset();

    useEffect(() => {
        if (!open) {
            setOtpSent(false);
            setOtp("");
        }
    }, [open]);

    const handleClose = () => {
        onClose();
    };

    const handleInitiate = () => {
        if (!user) return;
        initiateReset(user.id, {
            onSuccess: () => {
                setOtpSent(true);
                toast.success("Mã OTP đã được gửi về email người dùng!");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Không thể gửi OTP");
            }
        });
    };

    const handleConfirm = () => {
        if (!user || !otp) return;
        confirmReset({ id: user.id, otp }, {
            onSuccess: () => {
                toast.success("Đặt lại mật khẩu thành công! Mật khẩu mới đã được gửi đến email người dùng.");
                handleClose();
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Xác thực OTP thất bại");
            }
        });
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { 
                    borderRadius: '24px', 
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                }
            }}
        >
            <Box sx={{ position: 'relative', p: 4 }}>
                <IconButton 
                    onClick={handleClose} 
                    sx={{ 
                        position: 'absolute', 
                        top: 16, 
                        right: 16,
                        bgcolor: 'rgba(0,0,0,0.05)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>

                <AnimatePresence mode="wait">
                    {!otpSent ? (
                        <motion.div
                            key="initiate"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                        >
                            <Box sx={{ 
                                width: 64, height: 64, 
                                bgcolor: '#FF62621a', 
                                borderRadius: '16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#FF6262',
                                mb: 3
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                            </Box>

                            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: '#102937', letterSpacing: '-0.02em' }}>
                                Đặt lại mật khẩu
                            </Typography>
                            
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, px: 2, lineHeight: 1.6 }}>
                                Hệ thống sẽ gửi mã OTP xác thực cho <span style={{ color: '#FF6262', fontWeight: 700 }}>{user?.fullName}</span>. 
                                Mật khẩu mới sẽ được tự động gửi qua email sau khi xác nhận.
                            </Typography>

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleInitiate}
                                disabled={isInitiating}
                                sx={{
                                    height: 48,
                                    bgcolor: '#FF6262',
                                    color: 'white',
                                    borderRadius: '12px',
                                    fontWeight: 900,
                                    fontSize: '1rem',
                                    textTransform: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(255, 98, 98, 0.26)',
                                    '&:hover': { bgcolor: '#ef4444', transform: 'translateY(-1px)' },
                                    '&:active': { transform: 'scale(0.98)' },
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isInitiating ? <CircularProgress size={24} color="inherit" /> : "Gửi mã OTP ngay"}
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                        >
                            <Box sx={{ 
                                width: 64, height: 64, 
                                bgcolor: '#f59e0b1a', 
                                borderRadius: '16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#f59e0b',
                                mb: 3
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </Box>

                            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: '#102937', letterSpacing: '-0.02em' }}>
                                Xác thực OTP
                            </Typography>
                            
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                                Mã đã gửi đến <span style={{ fontWeight: 700, color: '#FF6262' }}>{user?.email}</span>
                            </Typography>

                             <Box sx={{ mb: 4, width: '100%' }}>
                                <OtpInput value={otp} onChange={setOtp} disabled={isConfirming} />
                            </Box>

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleConfirm}
                                disabled={isConfirming || otp.length !== 6}
                                sx={{
                                    height: 48,
                                    bgcolor: '#FF6262',
                                    color: 'white',
                                    borderRadius: '12px',
                                    fontWeight: 900,
                                    fontSize: '1rem',
                                    textTransform: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(255, 98, 98, 0.26)',
                                    '&:hover': { bgcolor: '#ef4444' },
                                    '&:active': { transform: 'scale(0.98)' },
                                    mb: 2
                                }}
                            >
                                {isConfirming ? <CircularProgress size={24} color="inherit" /> : "Xác nhận & Gửi mật khẩu"}
                            </Button>

                            <Button 
                                variant="text" 
                                onClick={() => setOtpSent(false)}
                                sx={{ color: 'text.disabled' }}
                            >
                                Quay lại
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Dialog>
    );
};

