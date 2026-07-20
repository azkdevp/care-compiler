import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Care Compiler — Can the plan fit the person?",
  description:
    "Care Compiler combines fragmented care plans, calculates their hidden workload, and stress-tests whether the plan can fit a patient's real life.",
  applicationName: "Care Compiler",
  keywords: ["care plans", "healthcare workload", "patient capacity", "OpenAI Build Week"],
  openGraph: {
    title: "Care Compiler",
    description: "Every doctor created a reasonable care plan. Maria only has one life.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
