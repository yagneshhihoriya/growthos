import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

function greetingNameFromSession(name: string | null | undefined, email: string | null | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email?.split("@")[0]?.trim();
  if (local) return local;
  return "there";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const stats = await getDashboardStats(session.user.id);
  const userName = greetingNameFromSession(session.user.name, session.user.email);

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <DashboardOverview stats={stats} userName={userName} />
    </div>
  );
}
