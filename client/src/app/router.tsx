import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MarketingLayout } from './MarketingLayout';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './session';
import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage, SignupPage } from '../features/auth/LoginPage';
import { NotFoundPage } from '../features/NotFound';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

// Feature routes are code-split: each /app page loads on demand so the initial
// bundle only carries the critical first-paint path (landing + auth + layouts).
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AdvisoryPage = lazy(() =>
  import('../features/advisory/AdvisoryPage').then((m) => ({ default: m.AdvisoryPage })),
);
const DiseasePage = lazy(() =>
  import('../features/disease/DiseasePage').then((m) => ({ default: m.DiseasePage })),
);
const SoilPage = lazy(() =>
  import('../features/soil/SoilPage').then((m) => ({ default: m.SoilPage })),
);
const WeatherPage = lazy(() =>
  import('../features/weather/WeatherPage').then((m) => ({ default: m.WeatherPage })),
);
const HistoryPage = lazy(() =>
  import('../features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const ChatbotPage = lazy(() =>
  import('../features/chatbot/ChatbotPage').then((m) => ({ default: m.ChatbotPage })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const KvkDirectoryPage = lazy(() =>
  import('../features/kvk/KvkDirectoryPage').then((m) => ({ default: m.KvkDirectoryPage })),
);

export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    path: '/app',
    errorElement: <ErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'advisory', element: <AdvisoryPage /> },
      { path: 'disease', element: <DiseasePage /> },
      { path: 'soil', element: <SoilPage /> },
      { path: 'weather', element: <WeatherPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'chatbot', element: <ChatbotPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'kvk-directory', element: <KvkDirectoryPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
