import { useEffect } from "react";
import { SHOP } from "../config";

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} | ${SHOP.name}`
      : `${SHOP.name} – ${SHOP.tagline}`;
  }, [title]);
}
