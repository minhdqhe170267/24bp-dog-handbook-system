import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { useAuth } from '../../hooks/useAuth';

// Routes allowed per role
const ROLE_ROUTES = {
    ADMIN: null, // null = all routes allowed
    CONTENT_EDITOR: [
        '/dashboard', '/',
        '/content', '/content/create',
        '/breeds',
        '/diseases',
        '/training/exercises', '/training/methods', '/training/roadmaps',
        '/nutrition',
        '/medications', '/medical', '/medical/symptoms',
        '/suggestions',
    ],
    REVIEWER: [
        '/dashboard', '/',
        '/content',
        '/approval',
    ],
};

const isReviewerContentDetailPath = (pathname) => {
    if (pathname === '/content/create' || pathname === '/content/history') {
        return false;
    }
    return /^\/content\/[^/]+$/.test(pathname);
};

const isPathAllowedByRole = (role, pathname, allowedRoutes) => {
    if (allowedRoutes === null || allowedRoutes === undefined) return true;

    return allowedRoutes.some((route) => {
        if (route === '/') return pathname === '/';

        if (role === 'REVIEWER' && route === '/content') {
            return pathname === '/content' || isReviewerContentDetailPath(pathname);
        }

        return pathname === route || pathname.startsWith(`${route}/`);
    });
};

const AppLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return <Navigate to="/login" replace />;

    // Block TRAINER from accessing web admin
    if (user.role === 'TRAINER') {
        logout();
        return <Navigate to="/login" replace />;
    }

    // Check if current route is allowed for user's role
    const allowedRoutes = ROLE_ROUTES[user.role];
    if (allowedRoutes !== null && allowedRoutes !== undefined) {
        const isAllowed = isPathAllowedByRole(user.role, location.pathname, allowedRoutes);
        if (!isAllowed) {
            // Redirect to first allowed route
            return <Navigate to={allowedRoutes[0] || '/dashboard'} replace />;
        }
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AppHeader />
                <main className="flex-1 overflow-y-auto scrollbar-thin">
                    <div className="p-6 page-transition" key={location.pathname}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
