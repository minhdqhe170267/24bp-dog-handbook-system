import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import router from './router';

const App = () => (
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);

export default App;
