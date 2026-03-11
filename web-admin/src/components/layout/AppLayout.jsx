import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { useAuth } from '../../hooks/useAuth';

// Routes allowed per role
const ROLE_ROUTES = {
    ADMIN: null, // null = all routes allowed
    CONTENT_EDITOR: [
        '/dashboard', '/',
        '/content', '/content/create', '/content/history',
        '/breeds',
        '/training/exercises', '/training/methods', '/training/roadmaps',
        '/nutrition',
        '/suggestions',
    ],
    REVIEWER: [
        '/dashboard', '/',
        '/content',
        '/approval',
    ],
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
        const isAllowed = allowedRoutes.some(r => location.pathname === r || location.pathname.startsWith(r + '/'));
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
