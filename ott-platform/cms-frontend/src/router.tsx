import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuthStore }   from '@/stores/auth.store';
import AppLayout          from '@/components/Layout/AppLayout';
import { Spinner }        from '@/components/UI';

// ─── Lazy page imports ────────────────────────────────────────
const LoginPage          = lazy(() => import('@/pages/Auth/LoginPage'));
const Dashboard          = lazy(() => import('@/pages/Dashboard/Dashboard'));
const ContentList        = lazy(() => import('@/pages/Content/ContentList'));
const ContentForm        = lazy(() => import('@/pages/Content/ContentForm'));
const UploadPage         = lazy(() => import('@/pages/Content/UploadPage'));
const EncodingQueue      = lazy(() => import('@/components/EncodingQueue/EncodingQueue'));
const UserManagement     = lazy(() => import('@/pages/Users/UserManagement'));
const NotificationsPage  = lazy(() => import('@/pages/Notifications/NotificationsPage'));
const SettingsPage       = lazy(() => import('@/pages/Settings/SettingsPage'));
const SubscriptionsPage  = lazy(() => import('@/pages/Subscriptions/SubscriptionsPage'));
const GenresPage         = lazy(() => import('@/pages/Genres/GenresPage'));
const AnalyticsPage      = lazy(() => import('@/pages/Analytics/AnalyticsPage'));

// ─── Auth Guard ───────────────────────────────────────────────
function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Block non-admin users
  if (user.role === 'user') {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <p className="text-xl font-semibold text-white">Access Denied</p>
        <p className="mt-2 text-sm text-surface-300">Admin access required.</p>
      </div>
    );
  }

  return <Outlet />;
}

// ─── Loading Fallback ─────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path:    '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index:   true,
            element: <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>,
          },
          // Movies
          {
            path:    'movies',
            element: <Suspense fallback={<PageLoader />}><ContentList type="movie" /></Suspense>,
          },
          {
            path:    'movies/new',
            element: <Suspense fallback={<PageLoader />}><ContentForm type="movie" /></Suspense>,
          },
          {
            path:    'movies/:id/edit',
            element: <Suspense fallback={<PageLoader />}><ContentForm type="movie" /></Suspense>,
          },
          {
            path:    'movies/:id/upload',
            element: <Suspense fallback={<PageLoader />}><UploadPage /></Suspense>,
          },
          // Series
          {
            path:    'series',
            element: <Suspense fallback={<PageLoader />}><ContentList type="series" /></Suspense>,
          },
          {
            path:    'series/new',
            element: <Suspense fallback={<PageLoader />}><ContentForm type="series" /></Suspense>,
          },
          {
            path:    'series/:id/edit',
            element: <Suspense fallback={<PageLoader />}><ContentForm type="series" /></Suspense>,
          },
          {
            path:    'series/:id/upload',
            element: <Suspense fallback={<PageLoader />}><UploadPage /></Suspense>,
          },
          // Upload
          {
            path:    'upload',
            element: <Suspense fallback={<PageLoader />}><UploadPage /></Suspense>,
          },
          // Encoding Queue
          {
            path:    'encoding',
            element: (
              <Suspense fallback={<PageLoader />}>
                <EncodingQueue />
              </Suspense>
            ),
          },
          // Users
          {
            path:    'users',
            element: <Suspense fallback={<PageLoader />}><UserManagement /></Suspense>,
          },
          // Notifications
          {
            path:    'notifications',
            element: <Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>,
          },
          // Settings
          {
            path:    'settings',
            element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>,
          },
          {
            path:    'subscriptions',
            element: <Suspense fallback={<PageLoader />}><SubscriptionsPage /></Suspense>,
          },
          // Genres
          {
            path:    'genres',
            element: <Suspense fallback={<PageLoader />}><GenresPage /></Suspense>,
          },
          // Analytics
          {
            path:    'analytics',
            element: <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>,
          },
          // Catch-all
          {
            path:    '*',
            element: <Navigate to="/" replace />,
          },
        ],
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
