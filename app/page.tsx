// This Next.js app is the API + admin portal only — the marketing site
// (Home/Careers/Apply/Contact/SignIn) is the separate static frontend.
// This root route just redirects into the admin portal.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/admin");
}
