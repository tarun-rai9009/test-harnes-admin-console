import { AdminChrome } from "@/components/admin/AdminChrome";
import Link from "next/link";

const actions = [
  {
    href: "/carrier-master/create",
    title: "Create New Carrier",
    desc: "Draft a carrier with validated form fields.",
  },
  {
    href: "/carrier-master/lookup",
    title: "Look for Carrier with Carrier Code",
    desc: "Fetch and review full carrier details.",
  },
  {
    href: "/carrier-master/update",
    title: "Update Carrier",
    desc: "Section-by-section updates with review before save.",
  },
  {
    href: "/carrier-master/carriers",
    title: "List All Carriers",
    desc: "Table of carriers from Zinnia.",
  },
  {
    href: "/carrier-master/delete",
    title: "Delete Carrier",
    desc: "Remove a carrier by code from Zinnia. This cannot be undone.",
  },
] as const;

export default function CarrierMasterHubPage() {
  return (
    <AdminChrome activeService="carrier-master" title="Carrier Master">
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-accent-muted">
        Choose an operation. Requests use the Zinnia carrier APIs.
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
