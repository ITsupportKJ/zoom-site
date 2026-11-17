import { Navigate, Outlet, Link, useNavigate } from "react-router-dom";

export default function AdminRoute() {
  const navigate = useNavigate();

  if (!localStorage.getItem("admin-token")) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = () => {
    localStorage.removeItem("admin-token");
    navigate("/admin/login");
  };

  return (
    <>
      <div className="admin-bar">
        <div className="container admin-bar-inner">
          <strong>Admin</strong>
          <Link to="/admin">Frames</Link>
          <Link to="/admin/inquiries">Inquiries</Link>
          <button className="link-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
      <Outlet />
    </>
  );
}
