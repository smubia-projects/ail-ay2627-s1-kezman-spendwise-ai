import { redirect } from "next/navigation";

// The showcase has no sign-in: the app opens straight on the dashboard.
export default function HomePage() {
  redirect("/dashboard");
}
