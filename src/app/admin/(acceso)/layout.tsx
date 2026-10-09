import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../panel.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LayoutAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="panel-shell">
      <header className="panel-cabecera">
        <span className="panel-marca">
          Trofeo Escudero <span>Panel</span>
        </span>
      </header>
      {children}
    </div>
  );
}
