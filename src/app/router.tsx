import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { GoalPage } from '../features/goals/GoalPage'
import { FocusPage } from '../features/timer/FocusPage'
import { ReviewPage } from '../features/reviews/ReviewPage'
import { SettingsPage } from '../features/settings/SettingsPage'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'goals', element: <GoalPage /> },
      { path: 'focus', element: <FocusPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
