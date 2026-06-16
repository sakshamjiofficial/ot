import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/stores/auth.store';
import { useUploadStore } from '@/stores/upload.store';
import { ProgressBar } from '@/components/UI';
import { cn } from '@/utils/cn';

const PAGE_TITLES: Record<string, string> = {
  '/':            'Dashboard',
  '/movies':      'Movies',
  '/series':      'Series',
  '/upload':      'Upload Content',
  '/encoding':    'Encoding Queue',
  '/users':       'User Management',
  '/analytics':   'Analytics',
  '/banners':     'Default Avatars',
  '/genres':      'Genre Management',
  '/notifications': 'Notifications',
  '/settings':    'Settings',
};

export default function AppLayout() {
  const location    = useLocation();
  const { user }    = useAuthStore();
  const uploads     = useUploadStore((s) => s.uploads);
  const title       = PAGE_TITLES[location.pathname] || 'Admin';

  // Active uploads for global progress indicator
  const activeUploads = Object.values(uploads).filter(
    (u) => u.status === 'uploading' || u.status === 'transcoding',
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-surface-700 bg-surface-800 px-6">
          <div>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            <p className="text-xs text-surface-300">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Active uploads pill */}
            {activeUploads.length > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                <span className="text-xs font-medium text-brand-400">
                  {activeUploads.length} uploading
                </span>
              </div>
            )}

            <button className="rounded-lg p-2 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors">
              <Bell size={18} />
            </button>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white uppercase">
              {user?.displayName?.[0] || user?.email?.[0] || 'A'}
            </div>
          </div>
        </header>

        {/* Global upload progress bar */}
        {activeUploads.some((u) => u.status === 'uploading') && (
          <div className="h-0.5 w-full">
            <ProgressBar
              value={
                activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length
              }
              className="h-0.5 rounded-none"
            />
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
