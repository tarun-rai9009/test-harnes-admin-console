import { APP_DISPLAY_NAME } from "@/lib/branding";
import { HeaderNavControls } from "@/components/admin/HeaderNavControls";
import Link from "next/link";
import type { ReactNode } from "react";

const SERVICE_NAV = [
  { href: "/carrier-master", label: "Carrier Master", id: "carrier-master" as const },
  { href: "/product-master", label: "Product Master", id: "product-master" as const },
];

export function AdminChrome({
  title,
  children,
  activeService,
  showHeaderNavControls = true,
}: {
  title?: string;
  children: ReactNode;
  activeService: "home" | "carrier-master" | "product-master";
  /** Back / Home toolbar; hidden on the main landing page */
  showHeaderNavControls?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface shadow-[var(--card-shadow-sm)]">
        <div className="h-1 w-full bg-accent" aria-hidden />
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex min-w-0 justify-start">
              {showHeaderNavControls ? <HeaderNavControls /> : null}
            </div>
            <p className="m-0 max-w-[min(100vw-8rem,28rem)] text-balance text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {APP_DISPLAY_NAME}
            </p>
            <div className="min-w-0" aria-hidden />
          </div>
          <nav
            className="mt-4 flex flex-wrap justify-center gap-1 border-t border-border pt-4"
            aria-label="Service areas"
          >
            {SERVICE_NAV.map((item) => {
              const active = activeService === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={
                    active
                      ? "rounded-md bg-accent-subtle px-3 py-2 text-sm font-semibold text-accent"
                      : "rounded-md px-3 py-2 text-sm font-medium text-accent-muted transition hover:bg-surface-muted hover:text-foreground"
                  }
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
        {title ? (
          <h1 className="mb-6 text-base font-semibold text-foreground">{title}</h1>
        ) : null}
        {children}
      </main>
    </div>
  );
}
