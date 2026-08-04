import React from 'react';
import { Card, Box, Avatar, Typography, Chip, Button, Stack } from '@mui/material';
import { Lock, Edit, CheckCircle, Ban } from 'lucide-react';
import dayjs from 'dayjs';

interface UserProfileSummaryCardProps {
  user: any;
  onEdit?: () => void;
  onChangePassword?: () => void;
}

export const UserProfileSummaryCard: React.FC<UserProfileSummaryCardProps> = ({
  user,
  onEdit,
  onChangePassword,
}) => {
  if (!user) return null;

  const roles = user.roles || user.rolesName || [];

  return (
    <Card sx={{ p: 4, borderRadius: 'var(--shape-borderRadius-lg)', textAlign: 'center' }}>
      <Avatar
        src={user.avatarUrl || user.avatar}
        alt={user.fullName || user.email}
        sx={{ width: 120, height: 120, mx: 'auto', mb: 2, boxShadow: 'var(--shadow-md)' }}
      />

      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {user.email}
      </Typography>

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mb: 3 }}>
        {user.isActive ? (
          <Chip
            icon={<CheckCircle size={14} />}
            label="Đang hoạt động"
            color="success"
            size="small"
            variant="outlined"
          />
        ) : (
          <Chip
            icon={<Ban size={14} />}
            label="Đã khóa"
            color="error"
            size="small"
            variant="outlined"
          />
        )}

        {Array.isArray(roles) &&
          roles.map((r: any, idx: number) => (
            <Chip
              key={idx}
              label={typeof r === 'string' ? r : r.name}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
        Ngày tham gia: {dayjs(user.createdAt).format('DD/MM/YYYY')}
      </Typography>

      <Stack direction="row" spacing={1.5} justifyContent="center">
        {onEdit && (
          <Button
            variant="outlined"
            startIcon={<Edit size={16} />}
            onClick={onEdit}
            size="small"
            sx={{ borderRadius: 'var(--shape-borderRadius)' }}
          >
            Chỉnh sửa
          </Button>
        )}
        {onChangePassword && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Lock size={16} />}
            onClick={onChangePassword}
            size="small"
            sx={{ borderRadius: 'var(--shape-borderRadius)' }}
          >
            Đổi mật khẩu
          </Button>
        )}
      </Stack>
    </Card>
  );
};
