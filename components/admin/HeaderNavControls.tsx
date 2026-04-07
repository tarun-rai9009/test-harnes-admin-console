"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function HeaderNavControls() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="ui-btn-secondary shrink-0 px-3 py-2 text-sm"
        aria-label="Go back"
        onClick={() => router.back()}
      >
        Back
      </button>
      <Link
        href="/"
        className="ui-btn-secondary inline-flex shrink-0 items-center justify-center px-3 py-2 text-sm no-underline"
      >
        Home
      </Link>
    </div>
  );
}
