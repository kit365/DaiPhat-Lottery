"use client";

import React, { useState } from 'react';
import { Card, Typography, TextField, Button, Stack, Box } from '@mui/material';

interface UserPasswordResetCardProps {
  accountName?: string;
  email?: string;
  isInitiating: boolean;
  isConfirming: boolean;
  onInitiate: () => void;
  onConfirm: (otp: string) => void;
  onCancel: () => void;
}

export const UserPasswordResetCard: React.FC<UserPasswordResetCardProps> = ({
  accountName,
  email,
  isInitiating,
  isConfirming,
  onInitiate,
  onConfirm,
  onCancel,
}) => {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleInitiateClick = () => {
    onInitiate();
    setOtpSent(true);
  };

  const handleConfirmClick = () => {
    onConfirm(otp);
  };

  return (
    <Card sx={{ p: 4, borderRadius: 'var(--shape-borderRadius-lg)' }}>
      {accountName && (
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, fontSize: '1rem' }}>
          Đặt lại mật khẩu cho: {accountName}
        </Typography>
      )}
      {email && (
        <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary', fontSize: '0.8125rem' }}>
          Email: {email}
        </Typography>
      )}

      {!otpSent ? (
        <Stack spacing={3}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Nhấn nút bên dưới để gửi mã OTP đặt lại mật khẩu. Sau khi xác nhận OTP, hệ thống sẽ tự
            tạo mật khẩu mới và gửi qua email người dùng.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              sx={{
                borderRadius: 'var(--shape-borderRadius)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
              }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              onClick={handleInitiateClick}
              disabled={isInitiating}
              sx={{
                bgcolor: 'var(--palette-text-primary)',
                color: 'var(--palette-common-white)',
                borderRadius: 'var(--shape-borderRadius)',
                px: 4,
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'var(--palette-grey-700)', boxShadow: 'none' },
              }}
            >
              {isInitiating ? 'Đang gửi...' : 'Gửi mã OTP'}
            </Button>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={3}>
          <TextField
            label="Nhập mã OTP"
            fullWidth
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Nhập mã OTP gồm 6 chữ số"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 'var(--shape-borderRadius)',
                fontSize: '0.875rem',
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="text"
              onClick={() => setOtpSent(false)}
              sx={{
                borderRadius: 'var(--shape-borderRadius)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
              }}
            >
              Quay lại
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmClick}
              disabled={isConfirming || otp.length < 6}
              sx={{
                bgcolor: 'var(--palette-text-primary)',
                color: 'var(--palette-common-white)',
                borderRadius: 'var(--shape-borderRadius)',
                px: 4,
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'var(--palette-grey-700)', boxShadow: 'none' },
              }}
            >
              {isConfirming ? 'Đang xác thực...' : 'Xác nhận đặt lại'}
            </Button>
          </Box>
        </Stack>
      )}
    </Card>
  );
};
