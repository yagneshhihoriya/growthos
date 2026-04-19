import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const test = await db.abTest.findFirst({
    where: { id: params.id, sellerId: session.user.id },
  });
  if (!test) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (test.status === "complete") {
    return NextResponse.json({ error: "Cannot delete a completed test" }, { status: 400 });
  }

  await db.abTest.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
