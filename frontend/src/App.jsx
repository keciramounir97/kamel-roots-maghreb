import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

// ===== PUBLIC PAGES =====
import Home from "./pages/home";
import Library from "./pages/library";
import Periods from "./pages/periods";
import Archives from "./pages/Archives";
import Sources from "./pages/Sources";
import AccessReliability from "./pages/AccessReliability";

// ===== AUTH PAGES =====
import Login from "./pages/login";
import Signup from "./pages/signup";
import ResetPassword from "./pages/resetpassword";

// ===== ERROR =====
import ErrorPage from "./pages/error";

// ===== ADMIN =====
import AdminLayout from "./admin/AdminLayout";
import ProtectedRoute from "./admin/components/protectedRoute";

import Dashboard from "./admin/pages/Dashboard";
import Users from "./admin/pages/Users";
import Books from "./admin/pages/Books";
import Trees from "./admin/pages/Trees";
import Settings from "./admin/pages/Settings";
import ActivityLog from "./admin/pages/ActivityLog";
import AdminGallery from "./admin/pages/Gallery";

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
      offset: 50,
    });
  }, []);

  return (
    <>
      {/* Hide Navbar in Admin */}
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/periods" element={<Periods />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/access-reliability" element={<AccessReliability />} />
        <Route path="/sourcesandarchives" element={<Archives />} />

        {/* ===== AUTH ROUTES ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/resetpassword" element={<ResetPassword />} />

        {/* ===== ADMIN ROUTES (PROTECTED) ===== */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />

          <Route
            path="users"
            element={
              <ProtectedRoute roles={[1]} redirectTo="/admin">
                <Users />
              </ProtectedRoute>
            }
          />

          <Route path="books" element={<Books />} />
          <Route path="trees" element={<Trees />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activity" element={<ActivityLog />} />
        </Route>

        {/* ===== FALLBACK ===== */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
}

export default App;
