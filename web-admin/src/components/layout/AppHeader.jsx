import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, Search } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/utils';

const searchItems = [
    { label: 'Dashboard', href: '/dashboard', keywords: ['tổng quan', 'dashboard'] },
    { label: 'Giống chó', href: '/breeds', keywords: ['giống', 'chó', 'breed'] },
    { label: 'Quản lý chó', href: '/dogs', keywords: ['quản lý chó', 'hồ sơ chó', 'dogs'] },
    { label: 'Phân công chó', href: '/assignments', keywords: ['phân công', 'assign', 'trainer'] },
    { label: 'Bệnh', href: '/diseases', keywords: ['bệnh', 'disease'] },
    { label: 'Thuốc', href: '/medications', keywords: ['thuốc', 'medication'] },
    { label: 'Dinh dưỡng', href: '/nutrition', keywords: ['dinh dưỡng', 'nutrition'] },
    { label: 'Phương pháp', href: '/training/methods', keywords: ['phương pháp', 'method'] },
    { label: 'Bài tập', href: '/training/exercises', keywords: ['bài tập', 'exercise'] },
    { label: 'Lộ trình', href: '/training/roadmaps', keywords: ['lộ trình', 'roadmap'] },
    { label: 'Sơ cứu', href: '/medical', keywords: ['y tế', 'medical', 'sơ cứu'] },
    { label: 'Triệu chứng', href: '/medical/symptoms', keywords: ['triệu chứng', 'symptom', 'checker'] },
    { label: 'Quản lý người dùng', href: '/system/users', keywords: ['người dùng', 'user', 'users'] },
    { label: 'Cài đặt hệ thống', href: '/system/settings', keywords: ['cài đặt', 'settings', 'hệ thống'] },
    { label: 'Nhật ký kiểm tra', href: '/system/audit-logs', keywords: ['nhật ký', 'audit', 'log'] },
];

const AppHeader = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const searchRef = useRef(null);
    const dropdownRef = useRef(null);

    const filteredItems = useMemo(() => {
        if (!searchValue.trim()) return searchItems.slice(0, 6);
        const q = searchValue.toLowerCase();
        return searchItems.filter(
            (item) => item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q))
        );
    }, [searchValue]);

    useEffect(() => setSelectedIndex(0), [searchValue]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (href) => { navigate(href); setSearchValue(''); setSearchFocused(false); };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' && filteredItems[selectedIndex]) handleSelect(filteredItems[selectedIndex].href);
        else if (e.key === 'Escape') setSearchFocused(false);
    };

    const initials = user?.fullName
        ?.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase() || '?';

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-5 gap-4 flex-shrink-0 sticky top-0 z-20">
            {/* Global Search */}
            <div ref={searchRef} className={cn('relative transition-all duration-300 ease-out', searchFocused ? 'flex-1 max-w-lg' : 'w-72')}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <input
                    type="text"
                    placeholder="Tìm kiếm nhanh..."
                    className="w-full pl-9 h-9 bg-muted/50 border border-border/60 rounded-lg text-sm outline-none focus:bg-card focus:border-accent/40 transition-all"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={handleKeyDown}
                />
                <AnimatePresence>
                    {searchFocused && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/60 rounded-lg shadow-elevated overflow-hidden z-50"
                        >
                            {filteredItems.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    Không tìm thấy kết quả cho &ldquo;{searchValue}&rdquo;
                                </div>
                            ) : (
                                <div className="py-1.5">
                                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {searchValue ? 'Kết quả' : 'Truy cập nhanh'}
                                    </p>
                                    {filteredItems.map((item, i) => (
                                        <button
                                            key={item.href}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left',
                                                i === selectedIndex ? 'bg-accent/10 text-accent' : 'hover:bg-muted/50'
                                            )}
                                            onMouseEnter={() => setSelectedIndex(i)}
                                            onClick={() => handleSelect(item.href)}
                                        >
                                            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
                {/* Notification bell */}
                <button className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                    <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full gradient-primary text-[10px] text-accent-foreground flex items-center justify-center font-semibold">
                        3
                    </span>
                </button>

                {/* User dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2.5 h-9 px-2 hover:bg-muted transition-colors rounded-lg"
                    >
                        <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center ring-2 ring-accent/20">
                            <span className="text-[11px] font-semibold text-accent-foreground">{initials}</span>
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-xs font-semibold leading-none text-foreground">{user?.fullName || user?.username}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{user?.role || 'Admin'}</p>
                        </div>
                    </button>

                    <AnimatePresence>
                        {dropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-1 w-56 bg-card border border-border/60 rounded-lg shadow-elevated overflow-hidden z-50"
                            >
                                <div className="px-3 py-3 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                                            <span className="text-sm font-semibold text-accent-foreground">{initials}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{user?.fullName || user?.username}</p>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                                                {user?.role || 'Admin'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="py-1">
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
                                        <User className="h-4 w-4" />
                                        Hồ sơ cá nhân
                                    </button>
                                </div>
                                <div className="border-t border-border py-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors text-left"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
