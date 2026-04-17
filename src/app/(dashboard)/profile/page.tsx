import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const row = await db.seller.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, shopName: true, city: true, passwordHash: true, avatarUrl: true },
  });
  if (!row) {
    redirect("/login");
  }

  const { passwordHash, ...rest } = row;

  return (
    <ProfilePageClient
      initial={{
        ...rest,
        hasPassword: Boolean(passwordHash),
      }}
    />
  );
}
