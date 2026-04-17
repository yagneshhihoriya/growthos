import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SocialPostsClient } from "@/components/social/SocialPostsClient";

export default async function SocialPostsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <SocialPostsClient />;
}
