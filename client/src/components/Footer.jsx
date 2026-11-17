import { Link } from "react-router-dom";
import { SHOP } from "../config";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <h4>{SHOP.name}</h4>
          <p>{SHOP.tagline}</p>
        </div>
        <div>
          <h4>Contact</h4>
          <p>
            <a href={`tel:${SHOP.phone.replace(/\s/g, "")}`}>{SHOP.phone}</a>
          </p>
          <p>
            <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
          </p>
          <p>{SHOP.address}</p>
        </div>
        <div>
          <h4>Opening hours</h4>
          <p>{SHOP.hours}</p>
          <p>
            <Link to="/catalog">Browse frames</Link>
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} {SHOP.name}. All rights reserved.
      </div>
    </footer>
  );
}
