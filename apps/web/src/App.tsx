import { useContext } from 'react';
import { RouterProvider } from 'react-router-dom';
import { createRouter } from './router';
import { AuthContext } from './context/AuthContext';
import { AppLayout } from './app/AppLayout';

function App() {
  const auth = useContext(AuthContext);

  if (!auth) return null;

  if (auth.loading) {
    return <div style={{ padding: 24 }}>Checking session...</div>;
  }

  if (!auth.user) {
    return <LoginScreen />;
  }

  const router = createRouter();

  return (
    <AppLayout>
      <RouterProvider router={router} />
    </AppLayout>
  );
}

function LoginScreen() {
  const auth = useContext(AuthContext);
  if (!auth) return null;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <button
        onClick={auth.login}
        style={{
          padding: '12px 20px',
          fontSize: 16,
        }}
      >
        Login with Google
      </button>
    </div>
  );
}

export default App;
