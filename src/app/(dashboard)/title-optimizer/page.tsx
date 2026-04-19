import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TitleOptimizerClient } from "@/components/titles/TitleOptimizerClient";

export default async function TitleOptimizerPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <TitleOptimizerClient />;
}
