import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">{children}</main>
      <footer className="bg-navy-dark text-[#9fb0c3] py-8 mt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center text-xs">
          Dindigul District Aeroskatoball Association — Demo Portal. Content shown is sample data.
        </div>
      </footer>
    </div>
  );
}
