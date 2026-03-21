import { useEffect, useMemo, useState } from 'react';
import { KeyRound, ShieldCheck, UserCircle2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { Button, FormField, FormInput } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { getRoleLabel } from '../../utils/enumLabels';

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const ProfilePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);

  const updatePasswordField = (key, value) =>
    setPasswordForm((prev) => ({ ...prev, [key]: value }));

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
    } catch (error) {
      console.error('Load profile error:', error);
      toast.error(error?.message || 'Không tải được hồ sơ cá nhân');
      setProfile(user || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
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
    if (currentPassword === newPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error?.message || 'Không thể đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabel = useMemo(() => getRoleLabel(profile?.role || user?.role), [profile?.role, user?.role]);

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
          <div className="flex items-center gap-2 mb-4">
            <UserCircle2 className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-foreground">Thông tin tài khoản</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
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

          <form onSubmit={handleChangePassword}>
            <FormField label="Mật khẩu hiện tại" required>
              <FormInput
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
              />
            </FormField>
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
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-accent mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Backend hiện đã có API xem hồ sơ (`/auth/me`) và đổi mật khẩu (`/auth/change-password`).
            API cập nhật thông tin hồ sơ cá nhân theo từng role chưa được tách riêng.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

