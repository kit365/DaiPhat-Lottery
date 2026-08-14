import React from 'react';
import {
  Box,
  Stack,
  TableCell,
  TableRow,
  Typography,
  Tooltip,
} from '@mui/material';
import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';
import { AdminRowActionsMenu } from '../../../../components/ui/AdminRowActionsMenu';
import {
  CONFIG_DATA_TYPE_LABELS,
  ConfigDataType,
  SystemConfigResponse,
} from '../../types/system-config';
import { formatSystemConfigDisplayValue } from '../../utils/systemConfigDisplay.util';
import {
  getConfigDataTypeBadgeClass,
  isBooleanConfigOn,
} from '../../utils/systemConfigBadge';

interface SystemConfigTableRowProps {
  config: SystemConfigResponse;
  canEdit: boolean;
  onEdit: (config: SystemConfigResponse) => void;
}

const ConfigValueCell = ({ config }: { config: SystemConfigResponse }) => {
  const unit = config.unit?.trim();

  const valueNode = (() => {
    if (config.dataType === ConfigDataType.BOOLEAN) {
      const isOn = isBooleanConfigOn(config.configValue);
      return (
        <AdminStatusBadge
          label={isOn ? 'Bật' : 'Tắt'}
          modifier={isOn ? 'admin-status-badge--success' : 'admin-status-badge--inactive'}
        />
      );
    }

    const display = formatSystemConfigDisplayValue(
      config.configKey,
      config.configValue,
      config.dataType
    );

    if (display.isStructured && display.detailLines?.length) {
      return (
        <Tooltip
          title={
            <Box component="ul" sx={{ m: 0, pl: 2, textAlign: 'left' }}>
              {display.detailLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </Box>
          }
          placement="top"
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              lineHeight: 1.35,
              textAlign: 'center',
              cursor: 'help',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {display.summary}
          </Typography>
        </Tooltip>
      );
    }

    return (
      <Tooltip title={display.summary} placement="top">
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontFamily: config.dataType === ConfigDataType.TIME ? 'monospace' : 'inherit',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            textAlign: 'center',
          }}
        >
          {display.summary}
        </Typography>
      </Tooltip>
    );
  })();

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="baseline"
      justifyContent="center"
      sx={{ maxWidth: 120, mx: 'auto', flexWrap: 'nowrap' }}
    >
      {valueNode}
      {unit ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, whiteSpace: 'nowrap' }}>
          {unit}
        </Typography>
      ) : null}
    </Stack>
  );
};

export const SystemConfigTableRow: React.FC<SystemConfigTableRowProps> = ({
  config,
  canEdit,
  onEdit,
}) => {
  return (
    <TableRow
      hover
      sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)' } }}
    >
      <TableCell sx={{ width: '32%', verticalAlign: 'middle' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {config.configName || config.configKey}
        </Typography>
      </TableCell>
      <TableCell sx={{ width: '36%', verticalAlign: 'middle' }}>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {config.description}
        </Typography>
      </TableCell>
      <TableCell align="center" sx={{ width: 120, verticalAlign: 'middle' }}>
        <ConfigValueCell config={config} />
      </TableCell>
      <TableCell align="center">
        <AdminStatusBadge
          label={CONFIG_DATA_TYPE_LABELS[config.dataType] || config.dataType}
          modifier={getConfigDataTypeBadgeClass(config.dataType)}
        />
      </TableCell>
      {canEdit && (
        <TableCell align="center">
          {config.isEditable === false ? (
            <Tooltip title="Cấu hình hệ thống — không chỉnh sửa được">
              <span>
                <AdminRowActionsMenu
                  disabled
                  items={[
                    {
                      id: 'edit',
                      label: 'Chỉnh sửa',
                      icon: 'edit',
                      onClick: () => undefined,
                    },
                  ]}
                />
              </span>
            </Tooltip>
          ) : (
            <AdminRowActionsMenu
              items={[
                {
                  id: 'edit',
                  label: 'Chỉnh sửa',
                  icon: 'edit',
                  onClick: () => onEdit(config),
                },
              ]}
            />
          )}
        </TableCell>
      )}
    </TableRow>
  );
};
