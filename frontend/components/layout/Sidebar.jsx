"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  TrendingUp,
  Briefcase,
  Bell,
  Newspaper,
  Cpu,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chart", label: "Chart", icon: LineChart },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/watchlist", label: "Watchlist", icon: Bell },
  { href: "/sentiment", label: "Sentiment", icon: Newspaper },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Cpu size={16} color="#6366F1" strokeWidth={2.5} />
        Tradr<span style={{ color: "#6366F1" }}></span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        For educational use only.
        <br />
        Not financial advice.
      </div>
    </aside>
  );
}
