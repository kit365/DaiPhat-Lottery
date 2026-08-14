import {
    getSystemConfigs,
    updateSystemConfig,
} from '../../../features/system-config/services/systemConfigService';
import { ConfigType, SystemConfigResponse } from '../../../features/system-config/types/system-config';
import { SettingPageFormValues } from '@/admin/features/settings/schemas/setting.schema';

export type StaticPageConfigKey =
    | 'PAGE_ABOUT'
    | 'PAGE_FAQ'
    | 'PAGE_PRIVACY'
    | 'PAGE_TERMS'
    | 'PAGE_SHIPPING'
    | 'PAGE_RETURNS'
    | 'PAGE_CONTACT'
    | 'PAGE_CAREERS'
    | 'PAGE_GUIDE_PLAY'
    | 'PAGE_GUIDE_BUY'
    | 'PAGE_GUIDE_PAYMENT'
    | 'PAGE_GUIDE_PRIZE';

export const POLICY_PAGE_KEYS: { key: StaticPageConfigKey; label: string }[] = [
    { key: 'PAGE_TERMS', label: 'Điều khoản sử dụng' },
    { key: 'PAGE_PRIVACY', label: 'Chính sách bảo mật' },
    { key: 'PAGE_SHIPPING', label: 'Chính sách vận chuyển' },
    { key: 'PAGE_RETURNS', label: 'Chính sách đổi trả' },
];

export const CONTENT_PAGE_KEYS: { key: StaticPageConfigKey; label: string }[] = [
    { key: 'PAGE_ABOUT', label: 'Giới thiệu' },
    { key: 'PAGE_FAQ', label: 'Câu hỏi thường gặp' },
    { key: 'PAGE_CONTACT', label: 'Liên hệ' },
    { key: 'PAGE_CAREERS', label: 'Tuyển dụng' },
    { key: 'PAGE_GUIDE_PLAY', label: 'Hướng dẫn chơi' },
    { key: 'PAGE_GUIDE_BUY', label: 'Hướng dẫn mua vé' },
    { key: 'PAGE_GUIDE_PAYMENT', label: 'Hướng dẫn thanh toán' },
    { key: 'PAGE_GUIDE_PRIZE', label: 'Hướng dẫn nhận thưởng' },
];

export const parsePageJson = (raw?: string | null): SettingPageFormValues => {
    if (!raw?.trim()) {
        return { title: '', content: '' };
    }
    try {
        const parsed = JSON.parse(raw) as { title?: string; content?: string };
        return {
            title: parsed.title ?? '',
            content: parsed.content ?? '',
        };
    } catch {
        return { title: '', content: raw };
    }
};

export const fetchStaticPage = async (
    configKey: StaticPageConfigKey
): Promise<{ form: SettingPageFormValues; config: SystemConfigResponse }> => {
    const res = await getSystemConfigs(ConfigType.STATIC_PAGE);
    const configs = res.data ?? [];
    const config = configs.find((c) => c.configKey === configKey);
    if (!config) {
        throw new Error(`Thiếu cấu hình ${configKey}. Hãy khởi động lại BE để seed.`);
    }
    return { form: parsePageJson(config.configValue), config };
};

export const saveStaticPage = async (
    configKey: StaticPageConfigKey,
    form: SettingPageFormValues
): Promise<void> => {
    const { config } = await fetchStaticPage(configKey);
    const nextValue = JSON.stringify({
        title: form.title?.trim() ?? '',
        content: form.content ?? '',
    });
    if (nextValue === config.configValue) {
        return;
    }
    await updateSystemConfig(config.id, {
        configName: config.configName,
        configValue: nextValue,
        description: config.description,
    });
};
