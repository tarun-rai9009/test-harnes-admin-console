import { AdminChrome } from "@/components/admin/AdminChrome";
import Link from "next/link";

const actions = [
  {
    href: "/create",
    title: "Create New Carrier",
    desc: "Draft a carrier with validated form fields.",
  },
  {
    href: "/lookup",
    title: "Look for Carrier with Carrier Code",
    desc: "Fetch and review full carrier details.",
  },
  {
    href: "/update",
    title: "Update Carrier",
    desc: "Section-by-section updates with review before save.",
  },
  {
    href: "/carriers",
    title: "List All Carriers",
    desc: "Table of carriers from Zinnia.",
  },
  {
    href: "/delete",
    title: "Delete carrier by code",
    desc: "Remove a carrier permanently using its 4-character code.",
  },
] as const;

export default function HomePage() {
  return (
    <AdminChrome>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-accent-muted">
        Choose an operation. All requests go directly to the Zinnia carrier APIs
        — no chat or LLM.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {actions.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              className="ui-card flex h-full flex-col p-5 shadow-[var(--card-shadow-sm)] transition hover:border-accent/30 hover:shadow-[var(--card-shadow)]"
            >
              <span className="text-base font-semibold text-foreground">
                {a.title}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-accent-muted">
                {a.desc}
              </span>
              <span className="mt-4 text-sm font-medium text-accent">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminChrome>
  );
}
