import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MarketingLayout } from './MarketingLayout';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './session';
import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage, SignupPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AdvisoryPage } from '../features/advisory/AdvisoryPage';
import { DiseasePage } from '../features/disease/DiseasePage';
import { SoilPage } from '../features/soil/SoilPage';
import { WeatherPage } from '../features/weather/WeatherPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { ChatbotPage } from '../features/chatbot/ChatbotPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { KvkDirectoryPage } from '../features/kvk/KvkDirectoryPage';
import { NotFoundPage } from '../features/NotFound';

export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    path: '/app',
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
