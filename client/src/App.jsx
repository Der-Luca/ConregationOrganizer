import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/entry/Register";

import AdminLayout from "./layout/AdminLayout";
import UserLayout from "./layout/UserLayout";

import AdminCarts from "./pages/admin/AdminCarts";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminUsers from "./pages/admin/AdminUsers";
import UserCarts from "./pages/user/UserCarts";
import UserEvents from "./pages/user/UserEvents";
import UserBookings from "./pages/user/UserBookings";
import MeetingPoints from "./pages/user/MeetingPoints";
import MeetingPointStats from "./pages/user/MeetingPointStats";
import Dashboard from "./pages/user/Dashboard";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/login" element={<Login />} />
      <Route path="/register/:token" element={<Register />} />

      {/* USER (alle eingeloggten User, inkl. Admin) */}
      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="carts" element={<UserCarts />} />
        <Route path="events" element={<UserEvents />} />
        <Route path="bookings" element={<UserBookings />} />
        <Route path="meeting-points" element={<MeetingPoints />} />
        <Route path="meeting-points/stats" element={<MeetingPointStats />} />
      </Route>

      {/* ADMIN (nur Admins) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="carts" element={<AdminCarts />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
