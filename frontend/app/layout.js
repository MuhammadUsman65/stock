import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import "./globals.css";

export const metadata = {
  title: "Tradr",
  description: "ML stock predictor — LSTM, Holt-Winters, FinBERT sentiment",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <div
            style={{
              marginLeft: 220,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
            }}
          >
            <Header />
            <main style={{ flex: 1 }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
