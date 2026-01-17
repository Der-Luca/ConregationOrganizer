import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";

import SelectRole from "./pages/entry/SelectRole";
import AdminLayout from "./layout/AdminLayout";
import UserLayout from "./layout/UserLayout";

import AdminCarts from "./pages/admin/AdminCarts";
import AdminEvents from "./pages/admin/AdminEvents";
import UserCarts from "./pages/user/UserCarts";
import UserEvents from "./pages/user/UserEvents";
import UserBookings from "./pages/user/UserBookings";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ENTRY */}
          <Route path="/" element={<SelectRole />} />

          {/* ADMIN */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="carts" element={<AdminCarts />} />
            <Route path="events" element={<AdminEvents />} />
          </Route>

          {/* USER */}
          <Route path="/user" element={<UserLayout />}>
            <Route path="carts" element={<UserCarts />} />
            <Route path="events" element={<UserEvents />} />
              <Route path="bookings" element={<UserBookings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
