import { useEffect, useMemo, useState } from 'react';
import { KeyRound, PencilLine, ShieldCheck, UserCircle2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { Button, FormField, FormInput } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { getRoleLabel } from '../../utils/enumLabels';

const EMPTY_PASSWORD_FORM = {
  newPassword: '',
  confirmPassword: '',
};

const EMPTY_PROFILE_FORM = {
  fullName: '',
  email: '',
  phone: '',
  militaryRank: '',
  unit: '',
};

const ProfilePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);

  const updatePasswordField = (key, value) =>
    setPasswordForm((prev) => ({ ...prev, [key]: value }));

  const updateProfileField = (key, value) =>
    setProfileForm((prev) => ({ ...prev, [key]: value }));

  const mapProfileToForm = (data) => ({
    fullName: data?.fullName || '',
    email: data?.email || '',
    phone: data?.phone || '',
    militaryRank: data?.militaryRank || '',
    unit: data?.unit || '',
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const meRes = await authService.getMe();
      const meData = meRes?.data || meRes || {};
      let profileData = { ...meData };

      // /users/{id} currently requires ADMIN role, so only enrich when permitted.
      if (String(meData?.role || '').toUpperCase() === 'ADMIN' && meData?.userId) {
        try {
          const userDetailRes = await userService.getById(meData.userId);
          const userDetail = userDetailRes?.data || userDetailRes || {};
          profileData = { ...userDetail, ...meData };
        } catch {
          // Keep fallback from /auth/me
        }
      }

      setProfile(profileData);
      setProfileForm(mapProfileToForm(profileData));
    } catch (error) {
      console.error('Load profile error:', error);
      toast.error(error, { title: 'Không tải được hồ sơ cá nhân' });
      setProfile(user || null);
      setProfileForm(mapProfileToForm(user || null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeNullable = (value) => {
    const normalized = String(value || '').trim();
    return normalized.length ? normalized : null;
  };

  const handleSaveProfile = async () => {
    if (!profile?.userId) {
      toast.error('Không tìm thấy mã người dùng');
      return;
    }

    const fullName = String(profileForm.fullName || '').trim();
    if (!fullName) {
      toast.error('Họ tên không được để trống');
      return;
    }

    setSavingProfile(true);
    try {
      await userService.update(profile.userId, {
        username: profile.username,
        fullName,
        email: normalizeNullable(profileForm.email),
        phone: normalizeNullable(profileForm.phone),
        role: profile.role,
        militaryRank: normalizeNullable(profileForm.militaryRank),
        unit: normalizeNullable(profileForm.unit),
      });

      toast.success('Cập nhật hồ sơ cá nhân thành công');
      setEditingProfile(false);
      await loadProfile();
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error, { title: 'Không thể cập nhật hồ sơ' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin đổi mật khẩu');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword({
        newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error, { title: 'Không thể đổi mật khẩu' });
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabel = useMemo(() => getRoleLabel(profile?.role || user?.role), [profile?.role, user?.role]);
  const canEditProfile = useMemo(
    () => String(profile?.role || user?.role || '').toUpperCase() === 'ADMIN',
    [profile?.role, user?.role]
  );
  const canChangePassword = useMemo(
    () => String(profile?.role || user?.role || '').toUpperCase() === 'ADMIN',
    [profile?.role, user?.role]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Xem thông tin tài khoản và cập nhật mật khẩu đăng nhập"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Hồ sơ cá nhân' },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Thông tin tài khoản</h2>
            </div>
            {canEditProfile && !loading && (
              <div className="flex items-center gap-2">
                {editingProfile ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileForm(mapProfileToForm(profile));
                      }}
                    >
                      Hủy
                    </Button>
                    <Button size="sm" loading={savingProfile} onClick={handleSaveProfile}>
                      Lưu thay đổi
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
                    <PencilLine className="h-4 w-4" />
                    Chỉnh sửa
                  </Button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          ) : canEditProfile && editingProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Họ tên" required>
                <FormInput
                  value={profileForm.fullName}
                  onChange={(event) => updateProfileField('fullName', event.target.value)}
                  placeholder="Nhập họ tên"
                />
              </FormField>
              <FormField label="Tên đăng nhập">
                <FormInput
                  value={profile?.username || ''}
                  disabled
                  className="bg-muted/70 text-muted-foreground cursor-not-allowed border-border/70"
                />
              </FormField>
              <FormField label="Vai trò">
                <FormInput
                  value={roleLabel || ''}
                  disabled
                  className="bg-muted/70 text-muted-foreground cursor-not-allowed border-border/70"
                />
              </FormField>
              <FormField label="Email">
                <FormInput
                  value={profileForm.email}
                  onChange={(event) => updateProfileField('email', event.target.value)}
                  placeholder="Nhập email"
                />
              </FormField>
              <FormField label="Số điện thoại">
                <FormInput
                  value={profileForm.phone}
                  onChange={(event) => updateProfileField('phone', event.target.value)}
                  placeholder="Nhập số điện thoại"
                />
              </FormField>
              <FormField label="Đơn vị">
                <FormInput
                  value={profileForm.unit}
                  onChange={(event) => updateProfileField('unit', event.target.value)}
                  placeholder="Nhập đơn vị"
                />
              </FormField>
              <FormField label="Cấp bậc">
                <FormInput
                  value={profileForm.militaryRank}
                  onChange={(event) => updateProfileField('militaryRank', event.target.value)}
                  placeholder="Nhập cấp bậc"
                />
              </FormField>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">Họ tên</p>
                <p className="text-sm font-medium text-foreground">{profile?.fullName || '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">Tên đăng nhập</p>
                <p className="text-sm font-medium text-foreground">{profile?.username || '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">Vai trò</p>
                <p className="text-sm font-medium text-foreground">{roleLabel || '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium text-foreground">{profile?.email || '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                <p className="text-sm font-medium text-foreground">{profile?.phone || '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">Đơn vị</p>
                <p className="text-sm font-medium text-foreground">{profile?.unit || '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">Cấp bậc</p>
                <p className="text-sm font-medium text-foreground">{profile?.militaryRank || '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-foreground">Đổi mật khẩu</h2>
          </div>

          {canChangePassword ? (
            <form onSubmit={handleChangePassword}>
              <FormField label="Mật khẩu mới" required>
                <FormInput
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </FormField>
              <FormField label="Xác nhận mật khẩu mới" required>
                <FormInput
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </FormField>

              <Button type="submit" className="w-full" loading={changingPassword}>
                Cập nhật mật khẩu
              </Button>
            </form>
          ) : (
            <div className="rounded-lg border border-border/60 bg-background px-3 py-3 text-sm text-muted-foreground">
              Chỉ tài khoản Admin mới có quyền đổi mật khẩu trên Web Admin.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-accent mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Backend hiện đã có API xem hồ sơ (`/auth/me`) và đổi mật khẩu (`/auth/change-password`).
            Theo policy hiện tại: Admin có thể chỉnh sửa hồ sơ của chính mình, các vai trò khác chỉ xem thông tin cá nhân.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
