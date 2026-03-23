import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, Search } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { Button, ConfirmDialog, FormInput, FormSelect } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { systemSettingService } from '../../services/systemSettingService';

const getDateTimeParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: value, date: '' };
  const two = (num) => String(num).padStart(2, '0');
  return {
    time: `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`,
    date: `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
};

const formatDateTimeInline = (value) => {
  const parts = getDateTimeParts(value);
  if (!parts) return '—';
  return `${parts.time} ${parts.date}`.trim();
};

const groupLabelMap = {
  SECURITY: 'Bảo mật',
  SYNC: 'Đồng bộ',
  UPLOAD: 'Upload',
  CONTENT: 'Quản lý nội dung',
  SYSTEM: 'Hệ thống',
};

const dataTypeLabelMap = {
  STRING: 'Chuỗi',
  INTEGER: 'Số nguyên',
  BOOLEAN: 'Đúng/Sai',
};

const SystemSettingsPage = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupedSettings, setGroupedSettings] = useState({});
  const [draftValues, setDraftValues] = useState({});

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await systemSettingService.getAllGrouped();
      const grouped = res?.data || {};
      setGroupedSettings(grouped);

      const nextDraftValues = {};
      Object.values(grouped).forEach((items) => {
        (items || []).forEach((item) => {
          nextDraftValues[item.settingKey] = item.settingValue ?? '';
        });
      });
      setDraftValues(nextDraftValues);
    } catch (error) {
      console.error('Fetch system settings error:', error);
      toast.error(error, { title: 'Không tải được cài đặt hệ thống' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedSearch = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return groupedSettings;
    const nextGroups = {};
    Object.entries(groupedSettings).forEach(([group, items]) => {
      const filtered = (items || []).filter((item) => {
        const haystack = [
          item?.settingKey,
          item?.description,
          item?.settingValue,
          item?.defaultValue,
          item?.dataType,
          group,
        ]
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value).toLowerCase())
          .join(' ');
        return haystack.includes(normalizedSearch);
      });
      if (filtered.length > 0) nextGroups[group] = filtered;
    });
    return nextGroups;
  }, [groupedSettings, normalizedSearch]);

  const flattenedSettings = useMemo(
    () => Object.values(groupedSettings).flatMap((items) => items || []),
    [groupedSettings]
  );

  const changedEntries = useMemo(() => {
    const entries = {};
    flattenedSettings.forEach((item) => {
      const key = item.settingKey;
      const current = item.settingValue ?? '';
      const draft = draftValues[key] ?? '';
      if (String(current) !== String(draft)) {
        entries[key] = draft;
      }
    });
    return entries;
  }, [flattenedSettings, draftValues]);

  const changedCount = Object.keys(changedEntries).length;

  const updateLocalSetting = (targetKey, newValue, updatedAt) => {
    setGroupedSettings((prev) => {
      const cloned = { ...prev };
      Object.keys(cloned).forEach((group) => {
        cloned[group] = (cloned[group] || []).map((item) =>
          item.settingKey === targetKey
            ? { ...item, settingValue: newValue, updatedAt: updatedAt || item.updatedAt }
            : item
        );
      });
      return cloned;
    });
    setDraftValues((prev) => ({ ...prev, [targetKey]: newValue }));
  };

  const handleSaveSingle = async (setting) => {
    const key = setting.settingKey;
    const value = draftValues[key] ?? '';

    setSavingKey(key);
    try {
      const res = await systemSettingService.update(key, value);
      const payload = res?.data;
      updateLocalSetting(key, payload?.settingValue ?? value, payload?.updatedAt);
      toast.success(`Đã cập nhật: ${key}`);
    } catch (error) {
      console.error('Update system setting error:', error);
      toast.error(error, { title: `Không thể cập nhật: ${key}` });
      setDraftValues((prev) => ({ ...prev, [key]: setting.settingValue ?? '' }));
    } finally {
      setSavingKey('');
    }
  };

  const handleSaveAll = async () => {
    if (changedCount === 0) {
      toast.info('Không có thay đổi để lưu');
      return;
    }

    setSavingBatch(true);
    try {
      const res = await systemSettingService.updateBatch(changedEntries);
      const payload = Array.isArray(res?.data) ? res.data : [];
      payload.forEach((item) => updateLocalSetting(item.settingKey, item.settingValue ?? '', item.updatedAt));
      toast.success(`Đã lưu ${payload.length} cài đặt`);
    } catch (error) {
      console.error('Update batch system settings error:', error);
      toast.error(error, { title: 'Không thể lưu hàng loạt' });
    } finally {
      setSavingBatch(false);
    }
  };

  const handleResetDefaults = async () => {
    setResetting(true);
    try {
      await systemSettingService.resetDefaults();
      toast.success('Đã khôi phục cài đặt mặc định');
      setResetConfirmOpen(false);
      await loadSettings();
    } catch (error) {
      console.error('Reset defaults error:', error);
      toast.error(error, { title: 'Không thể khôi phục mặc định' });
    } finally {
      setResetting(false);
    }
  };

  const renderEditor = (setting) => {
    const key = setting.settingKey;
    const dataType = String(setting.dataType || '').toUpperCase();
    const value = draftValues[key] ?? '';

    if (dataType === 'BOOLEAN') {
      return (
        <FormSelect
          value={String(value).toLowerCase()}
          onChange={(event) => setDraftValues((prev) => ({ ...prev, [key]: event.target.value }))}
          options={[
            { value: 'true', label: 'Bật (true)' },
            { value: 'false', label: 'Tắt (false)' },
          ]}
        />
      );
    }

    if (dataType === 'INTEGER') {
      return (
        <FormInput
          type="number"
          min="0"
          value={value}
          onChange={(event) => setDraftValues((prev) => ({ ...prev, [key]: event.target.value }))}
        />
      );
    }

    return (
      <FormInput
        value={value}
        onChange={(event) => setDraftValues((prev) => ({ ...prev, [key]: event.target.value }))}
      />
    );
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Quản lý cấu hình bảo mật, đồng bộ, upload và nội dung"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Quản trị hệ thống' },
          { label: 'Cài đặt hệ thống' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setResetConfirmOpen(true)} loading={resetting}>
              <RotateCcw className="h-4 w-4" />
              Khôi phục mặc định
            </Button>
            <Button onClick={handleSaveAll} loading={savingBatch}>
              <Save className="h-4 w-4" />
              Lưu thay đổi ({changedCount})
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo key, mô tả, giá trị..."
            className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="h-72 animate-pulse rounded-xl border border-border/60 bg-muted/15" />
      ) : Object.keys(filteredGroups).length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Không có cài đặt phù hợp
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(filteredGroups).map(([group, settings]) => (
            <div key={group} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {groupLabelMap[group] || group}
                </h3>
                <span className="text-xs text-muted-foreground">{settings.length} cài đặt</span>
              </div>

              <div className="space-y-3">
                {settings.map((setting) => {
                  const draftValue = draftValues[setting.settingKey] ?? '';
                  const currentValue = setting.settingValue ?? '';
                  const isChanged = String(draftValue) !== String(currentValue);
                  const isSaving = savingKey === setting.settingKey;

                  return (
                    <div key={setting.settingKey} className="rounded-lg border border-border/50 bg-background p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground break-all">{setting.settingKey}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{setting.description || '—'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {dataTypeLabelMap[setting.dataType] || setting.dataType || '—'}
                          </span>
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Mặc định: {setting.defaultValue ?? '—'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div>{renderEditor(setting)}</div>
                        <Button
                          variant={isChanged ? 'primary' : 'outline'}
                          onClick={() => handleSaveSingle(setting)}
                          disabled={!isChanged || isSaving}
                          loading={isSaving}
                        >
                          <Save className="h-4 w-4" />
                          Lưu
                        </Button>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">Cập nhật: {formatDateTimeInline(setting.updatedAt)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Khôi phục cài đặt mặc định"
        description="Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định?"
        onConfirm={handleResetDefaults}
        confirmLabel="Khôi phục"
        variant="destructive"
        loading={resetting}
      />
    </div>
  );
};

export default SystemSettingsPage;
