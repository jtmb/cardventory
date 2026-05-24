import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export const metadata = { title: "Notifications · Cardventory" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <NotificationsClient />;
}
