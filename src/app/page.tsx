import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSessionUser } from "@/lib/supabase/server";

export default async function RootPage() {
  if (!isSupabaseConfigured) redirect("/login");
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
