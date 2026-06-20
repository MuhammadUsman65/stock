"use client";
import { useState } from "react";
import useSWR from "swr";
import {
  getWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
} from "@/lib/api";
import { formatPrice, changeColor } from "@/lib/utils";
import { Trash2, Plus, Bell, BellOff, Edit2, Check, X } from "lucide-react";
import useStore from "@/store";

export default function WatchlistPage() {
  const { setTicker } = useStore();
  const [form, setForm] = useState({
    ticker: "",
    alert_threshold: "",
    alert_direction: "above",
  });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    alert_threshold: "",
    alert_direction: "above",
  });

  const {
    data: items,
    mutate,
    isLoading,
  } = useSWR("watchlist", getWatchlist, { refreshInterval: 30_000 });

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      await addWatchlistItem({
        ticker: form.ticker.toUpperCase(),
        alert_threshold: form.alert_threshold
          ? parseFloat(form.alert_threshold)
          : null,
        alert_direction: form.alert_direction,
      });
      setForm({ ticker: "", alert_threshold: "", alert_direction: "above" });
      setShowForm(false);
      mutate();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteWatchlistItem(id);
      mutate();
    } catch (_) {}
  }

  async function handleEdit(id) {
    try {
      await updateWatchlistItem(id, {
        alert_threshold: editForm.alert_threshold
          ? parseFloat(editForm.alert_threshold)
          : null,
        alert_direction: editForm.alert_direction,
      });
      setEditingId(null);
      mutate();
    } catch (_) {}
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({
      alert_threshold: item.alert_threshold ?? "",
      alert_direction: item.alert_direction,
    });
  }

  const triggered = items?.filter((i) => i.alert_triggered) ?? [];

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            Watchlist
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {items?.length ?? 0} ticker{items?.length !== 1 ? "s" : ""} tracked
          </div>
          {triggered.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              }}
            >
              <Bell size={13} color="var(--negative)" />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--negative)",
                  fontWeight: 600,
                }}
              >
                {triggered.length} alert{triggered.length !== 1 ? "s" : ""}{" "}
                triggered
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowForm((f) => !f)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 8,
            border: "none",
            background: showForm ? "var(--border)" : "var(--accent)",
            color: showForm ? "var(--text-secondary)" : "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <Plus size={15} />
          Add ticker
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <form
            onSubmit={handleAdd}
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {[
              {
                key: "ticker",
                label: "Ticker",
                placeholder: "MSFT",
                type: "text",
                width: 100,
              },
              {
                key: "alert_threshold",
                label: "Alert price ($)",
                placeholder: "Optional",
                type: "number",
                width: 140,
              },
            ].map(({ key, label, placeholder, type, width }) => (
              <div
                key={key}
                style={{ display: "flex", flexDirection: "column", gap: 5 }}
              >
                <label
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  required={key === "ticker"}
                  step={type === "number" ? "0.01" : undefined}
                  style={{
                    width,
                    padding: "8px 12px",
                    borderRadius: 7,
                    border: "1px solid var(--border)",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    background: "var(--bg)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Direction
              </label>
              <select
                value={form.alert_direction}
                onChange={(e) =>
                  setForm((f) => ({ ...f, alert_direction: e.target.value }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <option value="above">Price goes above</option>
                <option value="below">Price goes below</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={adding}
              style={{
                padding: "8px 20px",
                borderRadius: 7,
                border: "none",
                background: "var(--accent)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                cursor: adding ? "not-allowed" : "pointer",
                opacity: adding ? 0.7 : 1,
              }}
            >
              {adding ? "Adding..." : "Add"}
            </button>
            {error && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--negative)",
                  alignSelf: "center",
                }}
              >
                {error}
              </span>
            )}
          </form>
        </div>
      )}

      {/* Watchlist table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {isLoading ? (
          <div className="state-box" style={{ height: 200 }}>
            Loading watchlist...
          </div>
        ) : !items?.length ? (
          <div
            className="state-box"
            style={{ height: 200, flexDirection: "column", gap: 8 }}
          >
            <BellOff size={28} color="var(--text-muted)" strokeWidth={1.5} />
            <span style={{ color: "var(--text-muted)" }}>
              Nothing on your watchlist yet.
            </span>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  "Ticker",
                  "Current price",
                  "Alert",
                  "Direction",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 18px",
                      textAlign: "left",
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: item.alert_triggered
                      ? "rgba(244,63,94,0.03)"
                      : i % 2
                        ? "var(--bg)"
                        : "transparent",
                  }}
                >
                  <td style={{ padding: "12px 18px" }}>
                    <button
                      onClick={() => setTicker(item.ticker)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--accent)",
                      }}
                      title="Switch to this ticker"
                    >
                      {item.ticker}
                    </button>
                  </td>

                  <td
                    style={{
                      padding: "12px 18px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                    }}
                  >
                    {item.current_price != null ? (
                      `$${formatPrice(item.current_price)}`
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: "12px 18px" }}>
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editForm.alert_threshold}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            alert_threshold: e.target.value,
                          }))
                        }
                        placeholder="Price"
                        step="0.01"
                        style={{
                          width: 100,
                          padding: "5px 9px",
                          borderRadius: 6,
                          border: "1.5px solid var(--accent)",
                          outline: "none",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          background: "var(--surface)",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.alert_threshold != null ? (
                          `$${formatPrice(item.alert_threshold)}`
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "12px 18px" }}>
                    {editingId === item.id ? (
                      <select
                        value={editForm.alert_direction}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            alert_direction: e.target.value,
                          }))
                        }
                        style={{
                          padding: "5px 9px",
                          borderRadius: 6,
                          border: "1.5px solid var(--accent)",
                          outline: "none",
                          fontSize: 12,
                          background: "var(--surface)",
                          cursor: "pointer",
                        }}
                      >
                        <option value="above">Above</option>
                        <option value="below">Below</option>
                      </select>
                    ) : (
                      <span
                        style={{ fontSize: 12, color: "var(--text-muted)" }}
                      >
                        {item.alert_threshold != null
                          ? item.alert_direction
                          : "—"}
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "12px 18px" }}>
                    {item.alert_triggered ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "var(--negative-bg)",
                          color: "var(--negative)",
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        <Bell size={11} /> Triggered
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "var(--bg)",
                          color: "var(--text-muted)",
                          fontSize: 11.5,
                          border: "1px solid var(--border)",
                        }}
                      >
                        Watching
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "12px 18px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {editingId === item.id ? (
                        <>
                          <button
                            onClick={() => handleEdit(item.id)}
                            style={{
                              background: "var(--positive-bg)",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--positive)",
                              padding: "5px 8px",
                              borderRadius: 6,
                            }}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              padding: "5px 8px",
                              borderRadius: 6,
                            }}
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              padding: 4,
                              borderRadius: 5,
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              padding: 4,
                              borderRadius: 5,
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
