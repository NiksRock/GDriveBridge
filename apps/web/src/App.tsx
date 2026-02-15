import { RouterProvider } from 'react-router-dom';
import { createRouter } from './router';
import { useAuth } from './hooks/useAuth';

function App() {
  const { token } = useAuth();

  if (!token) {
    return <div>Please login</div>;
  }

  const router = createRouter(token);

  return <RouterProvider router={router} />;
}

export default App;
