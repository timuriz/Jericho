import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const RecoveryJobs = lazy(() => import('@/pages/RecoveryJobs'));
const RecoveryDetails = lazy(() => import('@/pages/RecoveryDetails'));
const Waitlist = lazy(() => import('@/pages/Waitlist'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Settings = lazy(() => import('@/pages/Settings'));
const Customers = lazy(() => import('@/pages/Customers'));

function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
          } />
          <Route path="recovery-jobs" element={
            <Suspense fallback={<PageLoader />}><RecoveryJobs /></Suspense>
          } />
          <Route path="recovery-jobs/:id" element={
            <Suspense fallback={<PageLoader />}><RecoveryDetails /></Suspense>
          } />
          <Route path="waitlist" element={
            <Suspense fallback={<PageLoader />}><Waitlist /></Suspense>
          } />
          <Route path="appointments" element={
            <Suspense fallback={<PageLoader />}><Appointments /></Suspense>
          } />
          <Route path="analytics" element={
            <Suspense fallback={<PageLoader />}><Analytics /></Suspense>
          } />
          <Route path="customers" element={
            <Suspense fallback={<PageLoader />}><Customers /></Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}><Settings /></Suspense>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
