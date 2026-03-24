import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { useAuth } from '../../hooks/useAuth';

// Routes allowed per role
const ROLE_ROUTES = {
    ADMIN: null, // null = all routes allowed
    CONTENT_EDITOR: [
        '/dashboard', '/',
        '/notifications',
        '/details',
        '/profile',
        '/content',
        '/import-data',
        '/export-data',
        '/breeds',
        '/dogs',
        '/assignments',
        '/diseases',
        '/training/exercises', '/training/methods', '/training/roadmaps',
        '/nutrition',
        '/medications', '/medical',
        '/suggestions',
    ],
    REVIEWER: [
        '/dashboard', '/',
        '/notifications',
        '/details',
        '/profile',
        '/content',
        '/approval',
    ],
};

const DETAIL_ENTITY_TYPE_ALIASES = {
    ASSIGNMENT: 'DOG_ASSIGNMENT',
    CONTENT_SUGGESTION: 'SUGGESTION',
};

const REVIEW_APPROVAL_ENTITY_TYPES = [
    'CONTENT',
    'DOG_BREED',
    'NUTRITION_STANDARD',
    'TRAINING_EXERCISE',
    'TRAINING_ROADMAP',
    'TRAINING_METHOD',
    'DEVELOPMENT_STAGE',
    'DISEASE',
    'MEDICATION',
    'FIRST_AID_GUIDE',
];

const ROLE_DETAIL_ENTITY_TYPES = {
    ADMIN: null,
    CONTENT_EDITOR: [
        ...REVIEW_APPROVAL_ENTITY_TYPES,
        'SUGGESTION',
    ],
    REVIEWER: REVIEW_APPROVAL_ENTITY_TYPES,
};

const isReviewerContentDetailPath = (pathname) => {
    if (pathname === '/content/create' || pathname === '/content/history') {
        return false;
    }
    return /^\/content\/[^/]+$/.test(pathname);
};

const normalizeDetailEntityType = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    return DETAIL_ENTITY_TYPE_ALIASES[normalized] || normalized;
};

const getDetailEntityTypeFromPath = (pathname) => {
    const match = pathname.match(/^\/details\/([^/]+)/i);
    if (!match) return null;
    const decoded = decodeURIComponent(match[1] || '');
    return normalizeDetailEntityType(decoded);
};

const isDetailRouteAllowedByRole = (role, pathname) => {
    if (!pathname.startsWith('/details/')) return true;
    const allowedEntityTypes = ROLE_DETAIL_ENTITY_TYPES[role];
    if (allowedEntityTypes === null || allowedEntityTypes === undefined) return true;

    const detailEntityType = getDetailEntityTypeFromPath(pathname);
    if (!detailEntityType) return false;
    return allowedEntityTypes.includes(detailEntityType);
};

const isPathAllowedByRole = (role, pathname, allowedRoutes) => {
    if (allowedRoutes === null || allowedRoutes === undefined) return true;
    if (!isDetailRouteAllowedByRole(role, pathname)) return false;

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
