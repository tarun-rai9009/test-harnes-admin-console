import { AdminChrome } from "@/components/admin/AdminChrome";

export default function HomePage() {
  return (
    <AdminChrome activeService="home" showHeaderNavControls={false}>
      <div className="mx-auto max-w-xl pt-4 text-center">
        <p className="text-base leading-relaxed text-accent-muted">
        This is a test harness for the Admin Console system, used to manage and validate carrier workflows.
        </p>
      </div>
    </AdminChrome>
  );
}
