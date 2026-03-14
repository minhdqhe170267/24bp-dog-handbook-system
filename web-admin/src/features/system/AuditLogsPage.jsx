import PageHeader from '../../components/shared/PageHeader';

const AuditLogsPage = () => (
  <div className="animate-fade-in">
    <PageHeader
      title="Nhật ký kiểm tra"
      description="Theo dõi lịch sử thao tác và hoạt động hệ thống"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Quản trị hệ thống' },
        { label: 'Nhật ký kiểm tra' },
      ]}
    />
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Backend cho nhật ký kiểm tra chưa được xác nhận endpoint CRUD, nên hiện tại màn này ở trạng thái chờ tích hợp API.
      </p>
    </div>
  </div>
);

export default AuditLogsPage;
