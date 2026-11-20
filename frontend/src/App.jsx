import { Routes, Route } from 'react-router';
import { ProtectedRoute, GuestRoute } from './components/RouteGuards';
import AppLayout from './components/AppLayout';
import TitleManager from './components/TitleManager';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyCircles from './pages/MyCircles';
import CreateCircle from './pages/CreateCircle';
import CircleDetails from './pages/CircleDetails';
import JoinCircle from './pages/JoinCircle';
import TrustScore from './pages/TrustScore';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <>
      <TitleManager />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/circles" element={<MyCircles />} />
            <Route path="/circles/new" element={<CreateCircle />} />
            <Route path="/circles/:id" element={<CircleDetails />} />
            <Route path="/join" element={<JoinCircle />} />
            <Route path="/trust" element={<TrustScore />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}