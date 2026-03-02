import { createBrowserRouter } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from './LoginPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import BreedsPage from '../features/breeds/BreedsPage';
import DiseasesPage from '../features/diseases/DiseasesPage';
import MedicationsPage from '../features/medications/MedicationsPage';
import NutritionPage from '../features/nutrition/NutritionPage';
import TrainingPage from '../features/training/TrainingPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'breeds', element: <BreedsPage /> },
      { path: 'diseases', element: <DiseasesPage /> },
      { path: 'medications', element: <MedicationsPage /> },
      { path: 'nutrition', element: <NutritionPage /> },
      { path: 'training', element: <TrainingPage /> },
    ],
  },
]);

export default router;
