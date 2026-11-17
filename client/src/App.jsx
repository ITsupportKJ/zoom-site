import { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AdminRoute from "./components/AdminRoute";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import FrameDetail from "./pages/FrameDetail";
import MySelection from "./pages/MySelection";
import AdminLogin from "./pages/AdminLogin";
import AdminFrames from "./pages/AdminFrames";
import AdminFrameForm from "./pages/AdminFrameForm";
import AdminInquiries from "./pages/AdminInquiries";

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  // Start at the top of the page on every navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/frames/:id" element={<FrameDetail />} />
          <Route path="/selection" element={<MySelection />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminFrames />} />
            <Route path="/admin/frames/new" element={<AdminFrameForm />} />
            <Route path="/admin/frames/:id" element={<AdminFrameForm />} />
            <Route path="/admin/inquiries" element={<AdminInquiries />} />
          </Route>

          <Route
            path="*"
            element={
              <p>
                Page not found. <Link to="/">Go home</Link>
              </p>
            }
          />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}
