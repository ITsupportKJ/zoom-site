import { createContext, useContext, useEffect, useState } from "react";

const SelectionContext = createContext(null);
const STORAGE_KEY = "frame-selection";

// Only sizeId + quantity are stored. Names, photos and prices are loaded
// live from the server, so they can never be out of date.
function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return [];
    const map = new Map();
    for (const r of raw) {
      const sizeId = Number(r?.sizeId);
      const quantity = parseInt(r?.quantity, 10);
      if (Number.isInteger(sizeId) && sizeId > 0 && quantity > 0) {
        map.set(sizeId, { sizeId, quantity: Math.min(quantity, 100) });
      }
    }
    return [...map.values()];
  } catch {
    return [];
  }
}

export function SelectionProvider({ children }) {
  const [items, setItems] = useState(loadSaved);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage can be blocked (private mode); the selection still works until refresh
    }
  }, [items]);

  const addItem = (sizeId, qty = 1) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.sizeId === sizeId);
      if (existing) {
        return prev.map((i) =>
          i.sizeId === sizeId
            ? { ...i, quantity: Math.min(i.quantity + qty, 100) }
            : i,
        );
      }
      return [...prev, { sizeId, quantity: qty }];
    });

  const removeItem = (sizeId) =>
    setItems((prev) => prev.filter((i) => i.sizeId !== sizeId));

  const updateQuantity = (sizeId, quantity) =>
    setItems((prev) =>
      prev.map((i) =>
        i.sizeId === sizeId
          ? { ...i, quantity: Math.min(Math.max(1, quantity), 100) }
          : i,
      ),
    );

  const clearSelection = () => setItems([]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <SelectionContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearSelection,
        count,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export const useSelection = () => useContext(SelectionContext);
