import { createBrowserRouter } from 'react-router-dom'
import App from '@/app/App'
import { LoginPage } from '@/features/auth'

export const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <LoginPage /> },
])
