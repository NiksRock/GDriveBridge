import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { CreateTransferPage } from './pages/CreateTransferPage';
import { TransferDetailsPage } from './pages/TransferDetailsPage';

export function createRouter() {
  return createBrowserRouter([
    { path: '/', element: <DashboardPage /> },
    { path: '/create', element: <CreateTransferPage /> },
    { path: '/transfers/:id', element: <TransferDetailsPage /> },
  ]);
}
