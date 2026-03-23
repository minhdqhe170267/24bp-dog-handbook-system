import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Dog, Pill, Apple, Dumbbell, Stethoscope, UserCheck,
    ChevronDown, ChevronLeft, BookOpen, Route, HeartPulse,
    FileText, CheckCircle, Lightbulb, Upload,
    Settings, ClipboardList, Users,
} from 'lucide-react';

// roles: if not specified, all roles can see; if specified, only those roles
const allNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    {
        label: 'Quản lý Nội dung', icon: FileText, roles: ['ADMIN', 'CONTENT_EDITOR', 'REVIEWER'], children: [
            { label: 'Danh sách nội dung', href: '/content', icon: FileText },
            { label: 'Duyệt nội dung', href: '/approval', icon: CheckCircle, roles: ['ADMIN', 'REVIEWER'] },
            { label: 'Nội dung đề xuất', href: '/suggestions', icon: Lightbulb, roles: ['ADMIN', 'CONTENT_EDITOR'] },
        ]
    },
    {
        label: 'Quản lý chó', icon: Dog, children: [
            { label: 'Giống chó', href: '/breeds', icon: Dog, roles: ['ADMIN', 'CONTENT_EDITOR'] },
            { label: 'Hồ sơ chó', href: '/dogs', icon: Dog, roles: ['ADMIN'] },
            { label: 'Phân công chó', href: '/assignments', icon: UserCheck, roles: ['ADMIN'] },
        ]
    },
    {
        label: 'Huấn luyện', icon: Dumbbell, roles: ['ADMIN', 'CONTENT_EDITOR'], children: [
            { label: 'Bài tập', href: '/training/exercises', icon: BookOpen },
            { label: 'Phương pháp', href: '/training/methods', icon: Dumbbell },
            { label: 'Lộ trình', href: '/training/roadmaps', icon: Route },
        ]
    },
    {
        label: 'Sức khỏe', icon: Stethoscope, roles: ['ADMIN', 'CONTENT_EDITOR'], children: [
            { label: 'Dinh dưỡng', href: '/nutrition', icon: Apple },
            { label: 'Bệnh', href: '/diseases', icon: HeartPulse },
            { label: 'Thuốc', href: '/medications', icon: Pill },
            { label: 'Sơ cứu', href: '/medical', icon: Stethoscope },
        ]
    },
    { label: 'Import dữ liệu', icon: Upload, href: '/import-data', roles: ['ADMIN', 'CONTENT_EDITOR'] },
    {
        label: 'Quản trị Hệ thống', icon: Settings, roles: ['ADMIN'], children: [
            { label: 'Quản lý người dùng', href: '/system/users', icon: Users },
            { label: 'Cài đặt hệ thống', href: '/system/settings', icon: Settings },
            { label: 'Nhật ký kiểm tra', href: '/system/audit-logs', icon: ClipboardList },
        ]
    },
];

const filterByRole = (items, role) => {
    return items
        .filter(item => !item.roles || item.roles.includes(role))
        .map(item => {
            if (item.children) {
                return { ...item, children: item.children.filter(c => !c.roles || c.roles.includes(role)) };
            }
            return item;
        })
        .filter(item => !item.children || item.children.length > 0);
};

const AppSidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [openGroups, setOpenGroups] = useState(['Quản lý Nội dung', 'Quản lý chó', 'Huấn luyện', 'Sức khỏe', 'Quản trị Hệ thống']);
    const location = useLocation();
    const { user } = useAuth();
    const navItems = useMemo(() => filterByRole(allNavItems, user?.role), [user?.role]);

    const toggleGroup = (label) => {
        setOpenGroups((prev) =>
            prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
        );
    };

    const isActive = (href) => href && location.pathname === href;
    const isGroupActive = (item) => item.children?.some((c) => location.pathname.startsWith(c.href));

    return (
        <aside className={cn(
            'h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex-shrink-0 relative',
            collapsed ? 'w-[68px]' : 'w-64'
        )}>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] to-transparent pointer-events-none" />

            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0 relative">
                <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                    <Dog className="h-5 w-5 text-accent-foreground" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            className="overflow-hidden"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h1 className="text-sm font-bold text-sidebar-primary-foreground truncate tracking-tight">24BP DHS</h1>
                            <p className="text-[10px] text-sidebar-foreground/50 truncate">Dog Handbook System</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2.5 relative">
                {navItems.map((item) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isOpen = openGroups.includes(item.label);
                    const groupActive = isGroupActive(item);
                    const Icon = item.icon;

                    if (!hasChildren) {
                        return (
                            <Link
                                key={item.label}
                                to={item.href}
                                className={cn(
                                    'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 mb-0.5 relative no-underline',
                                    isActive(item.href)
                                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                                        : 'hover:bg-sidebar-accent/80 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground'
                                )}
                            >
                                <Icon className={cn(
                                    'h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200',
                                    !isActive(item.href) && 'group-hover:scale-110'
                                )} />
                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.span
                                            className="truncate"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        );
                    }

                    return (
                        <div key={item.label} className="mb-0.5">
                            <button
                                onClick={() => !collapsed && toggleGroup(item.label)}
                                className={cn(
                                    'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                                    groupActive
                                        ? 'text-sidebar-primary-foreground bg-sidebar-accent'
                                        : 'hover:bg-sidebar-accent/80 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground'
                                )}
                            >
                                <Icon className="h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.div
                                            className="flex items-center flex-1 min-w-0"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <span className="truncate flex-1 text-left">{item.label}</span>
                                            <motion.div
                                                animate={{ rotate: isOpen ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                            <AnimatePresence>
                                {!collapsed && isOpen && (
                                    <motion.div
                                        className="ml-4 pl-3 border-l border-sidebar-border/50 mt-1 space-y-0.5 overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        {item.children.map((child, i) => {
                                            const ChildIcon = child.icon;
                                            return (
                                                <motion.div
                                                    key={child.href}
                                                    initial={{ x: -10, opacity: 0 }}
                                                    animate={{ x: 0, opacity: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                >
                                                    <Link
                                                        to={child.href}
                                                        className={cn(
                                                            'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all duration-200 no-underline',
                                                            isActive(child.href)
                                                                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                                                : 'hover:bg-sidebar-accent/80 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground'
                                                        )}
                                                    >
                                                        {ChildIcon && <ChildIcon className="h-3.5 w-3.5" />}
                                                        <span className="truncate">{child.label}</span>
                                                    </Link>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <div className="border-t border-sidebar-border/50 p-2 relative">
                <button
                    className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all duration-200"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
                        <ChevronLeft className="h-4 w-4" />
                    </motion.div>
                </button>
            </div>
        </aside>
    );
};

export default AppSidebar;
