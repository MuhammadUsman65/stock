"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import useStore from "@/store";
import { isMarketOpen } from "@/lib/utils";

export default function Header() {
  const { ticker, setTicker } = useStore();
  const [input, setInput] = useState("");
  const open = isMarketOpen();

  function handleSubmit(e) {
    e.preventDefault();
    const val = input.trim().toUpperCase();
    if (val.length) {
      setTicker(val);
      setInput("");
    }
  }

  return (
    <header className="header">
      <form onSubmit={handleSubmit} className="ticker-form">
        <Search size={13} color="var(--text-muted)" strokeWidth={2} />
        <input
          className="ticker-input"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder={`Viewing ${ticker} — type to switch`}
          maxLength={10}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="characters"
        />
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`market-badge ${open ? "open" : "closed"}`}>
          <span className={`market-dot ${open ? "open" : "closed"}`} />
          {open ? "Market open" : "Market closed"}
        </span>
      </div>
    </header>
  );
}
