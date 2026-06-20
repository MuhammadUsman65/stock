import { create } from "zustand";

const useStore = create((set) => ({
  ticker: "AAPL",
  period: "6mo",
  interval: "1d",

  setTicker: (ticker) => set({ ticker: ticker.trim().toUpperCase() }),
  setPeriod: (period) => set({ period }),
  setInterval: (interval) => set({ interval }),
}));

export default useStore;
