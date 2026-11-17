import { Link, NavLink } from "react-router-dom";
import { useSelection } from "../context/SelectionContext";
import { SHOP } from "../config";

export default function Navbar() {
  const { count } = useSelection();

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="logo">
          {SHOP.name}
        </Link>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/catalog">Catalog</NavLink>
          <NavLink to="/selection">
            My Selection {count > 0 && <span className="badge">{count}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
