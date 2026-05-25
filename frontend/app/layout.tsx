import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "CipherScope XAI — Side-Channel Analysis Platform",
  description:
    "Modern interactive platform for AES side-channel trace visualization, CPA analysis, synthetic trace generation, leakage analytics, and masking-based mitigation simulation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
