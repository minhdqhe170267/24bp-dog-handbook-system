import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { ThemeProvider } from '../hooks/useTheme';
import { ToastProvider } from '../components/ui/Toast';
import router from './router';

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
