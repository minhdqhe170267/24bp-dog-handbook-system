import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from './LoginPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import BreedsPage from '../features/breeds/BreedsPage';
import ExercisesPage from '../features/training/ExercisesPage';
import MethodsPage from '../features/training/MethodsPage';
import RoadmapsPage from '../features/training/RoadmapsPage';
import NutritionPage from '../features/nutrition/NutritionPage';
import MedicationsPage from '../features/medications/MedicationsPage';
import FirstAidGuidesPage from '../features/medical/FirstAidGuidesPage';
import ContentListPage from '../features/content/ContentListPage';
import ContentCreatePage from '../features/content/ContentCreatePage';
import ApprovalPage from '../features/approval/ApprovalPage';
import SuggestionsPage from '../features/suggestions/SuggestionsPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'content', element: <ContentListPage /> },
      { path: 'content/create', element: <ContentCreatePage /> },
      { path: 'content/:id', element: <ContentCreatePage /> },
      { path: 'content/:id/edit', element: <ContentCreatePage /> },
      { path: 'breeds', element: <BreedsPage /> },
      { path: 'training/exercises', element: <ExercisesPage /> },
      { path: 'training/methods', element: <MethodsPage /> },
      { path: 'training/roadmaps', element: <RoadmapsPage /> },
      { path: 'nutrition', element: <NutritionPage /> },
      { path: 'approval', element: <ApprovalPage /> },
      { path: 'suggestions', element: <SuggestionsPage /> },
      { path: 'medications', element: <MedicationsPage /> },
      { path: 'medical', element: <FirstAidGuidesPage /> },
    ],
  },
]);

export default router;
