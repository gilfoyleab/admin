import type { Metadata } from "next";
import "../src/styles.css";

export const metadata: Metadata = {
  title: "Nano Syllabus administration",
  description: "Admin Delight provides a Django-style admin interface for Nano Syllabus.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
