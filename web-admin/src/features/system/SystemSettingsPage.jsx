import PageHeader from '../../components/shared/PageHeader';

const SystemSettingsPage = () => (
  <div className="animate-fade-in">
    <PageHeader
      title="Cài đặt hệ thống"
      description="Khu vực cấu hình cho quản trị hệ thống"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Quản trị hệ thống' },
        { label: 'Cài đặt hệ thống' },
      ]}
    />
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Màn hình cài đặt đang được chuẩn hóa nghiệp vụ. Bạn có thể tiếp tục ưu tiên làm báo cáo hệ thống trước.
      </p>
    </div>
  </div>
);

export default SystemSettingsPage;
