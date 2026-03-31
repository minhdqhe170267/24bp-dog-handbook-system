import { Navigate, createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from './LoginPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import BreedsPage from '../features/breeds/BreedsPage';
import BreedsCreatePage from '../features/breeds/BreedsCreatePage';
import DiseasesPage from '../features/diseases/DiseasesPage';
import DiseasesCreatePage from '../features/diseases/DiseasesCreatePage';
import ExercisesPage from '../features/training/ExercisesPage';
import ExercisesCreatePage from '../features/training/ExercisesCreatePage';
import MethodsPage from '../features/training/MethodsPage';
import MethodsCreatePage from '../features/training/MethodsCreatePage';
import RoadmapsPage from '../features/training/RoadmapsPage';
import RoadmapsCreatePage from '../features/training/RoadmapsCreatePage';
import NutritionPage from '../features/nutrition/NutritionPage';
import NutritionCreatePage from '../features/nutrition/NutritionCreatePage';
import MedicationsPage from '../features/medications/MedicationsPage';
import MedicationsCreatePage from '../features/medications/MedicationsCreatePage';
import FirstAidGuidesPage from '../features/medical/FirstAidGuidesPage';
import FirstAidGuidesCreatePage from '../features/medical/FirstAidGuidesCreatePage';
import UserManagementPage from '../features/system/UserManagementPage';
import UserCreatePage from '../features/system/UserCreatePage';
import SystemSettingsPage from '../features/system/SystemSettingsPage';
import AuditLogsPage from '../features/system/AuditLogsPage';
import ContentListPage from '../features/content/ContentListPage';
import ContentCreatePage from '../features/content/ContentCreatePage';
import ApprovalPage from '../features/approval/ApprovalPage';
import SuggestionsPage from '../features/suggestions/SuggestionsPage';
import DogsPage from '../features/dogs/DogsPage';
import DogsCreatePage from '../features/dogs/DogsCreatePage';
import DogAssignmentsPage from '../features/assignments/DogAssignmentsPage';
import DogAssignmentsCreatePage from '../features/assignments/DogAssignmentsCreatePage';
import ProfilePage from '../features/profile/ProfilePage';
import ImportDataPage from '../features/import/ImportDataPage';
import ExportDataPage from '../features/export/ExportDataPage';
import NotificationsPage from '../features/notifications/NotificationsPage';
import EntityDetailPage from '../features/details/EntityDetailPage';
import ConflictListPage from '../features/sync-conflicts/ConflictListPage';
import ConflictDetailPage from '../features/sync-conflicts/ConflictDetailPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'sync-conflicts', element: <ConflictListPage /> },
      { path: 'sync-conflicts/:id', element: <ConflictDetailPage /> },
      { path: 'admin/sync-conflicts', element: <ConflictListPage /> },
      { path: 'admin/sync-conflicts/:id', element: <ConflictDetailPage /> },
      { path: 'details/:entityType/:id', element: <EntityDetailPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'content', element: <ContentListPage /> },
      { path: 'import-data', element: <ImportDataPage /> },
      { path: 'export-data', element: <ExportDataPage /> },
      { path: 'content/create', element: <Navigate to="/content" replace /> },
      { path: 'content/history', element: <Navigate to="/content" replace /> },
      { path: 'content/:id', element: <ContentCreatePage /> },
      { path: 'content/:id/edit', element: <Navigate to="/content" replace /> },
      { path: 'breeds', element: <BreedsPage /> },
      { path: 'breeds/create', element: <BreedsCreatePage /> },
      { path: 'breeds/:id/edit', element: <BreedsCreatePage /> },
      { path: 'diseases', element: <DiseasesPage /> },
      { path: 'diseases/create', element: <DiseasesCreatePage /> },
      { path: 'diseases/:id/edit', element: <DiseasesCreatePage /> },
      { path: 'training/exercises', element: <ExercisesPage /> },
      { path: 'training/exercises/create', element: <ExercisesCreatePage /> },
      { path: 'training/exercises/:id/edit', element: <ExercisesCreatePage /> },
      { path: 'training/methods', element: <MethodsPage /> },
      { path: 'training/methods/create', element: <MethodsCreatePage /> },
      { path: 'training/methods/:id/edit', element: <MethodsCreatePage /> },
      { path: 'training/roadmaps', element: <RoadmapsPage /> },
      { path: 'training/roadmaps/create', element: <RoadmapsCreatePage /> },
      { path: 'training/roadmaps/:id/edit', element: <RoadmapsCreatePage /> },
      { path: 'nutrition', element: <NutritionPage /> },
      { path: 'nutrition/create', element: <NutritionCreatePage /> },
      { path: 'nutrition/:id/edit', element: <NutritionCreatePage /> },
      { path: 'medications', element: <MedicationsPage /> },
      { path: 'medications/create', element: <MedicationsCreatePage /> },
      { path: 'medications/:id/edit', element: <MedicationsCreatePage /> },
      { path: 'medical', element: <FirstAidGuidesPage /> },
      { path: 'medical/create', element: <FirstAidGuidesCreatePage /> },
      { path: 'medical/:id/edit', element: <FirstAidGuidesCreatePage /> },
      { path: 'system/users', element: <UserManagementPage /> },
      { path: 'system/users/create', element: <UserCreatePage /> },
      { path: 'system/users/:id/edit', element: <UserCreatePage /> },
      { path: 'system/settings', element: <SystemSettingsPage /> },
      { path: 'system/audit-logs', element: <AuditLogsPage /> },
      { path: 'approval', element: <ApprovalPage /> },
      { path: 'suggestions', element: <SuggestionsPage /> },
      { path: 'dogs', element: <DogsPage /> },
      { path: 'dogs/create', element: <DogsCreatePage /> },
      { path: 'dogs/:id/edit', element: <DogsCreatePage /> },
      { path: 'assignments', element: <DogAssignmentsPage /> },
      { path: 'assignments/create', element: <DogAssignmentsCreatePage /> },
      { path: 'assignments/:id/edit', element: <DogAssignmentsCreatePage /> },
    ],
  },
]);

export default router;
