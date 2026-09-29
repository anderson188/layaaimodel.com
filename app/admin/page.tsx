import type { Metadata } from "next";
import { AdminClient } from "@/components/AdminClient";
import { PageTitle } from "@/components/PageTitle";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Admin",
  description: "Operator console: users, prepaid grants, registrations, usage, upstream mode.",
  alternates: { canonical: canonical("/admin/") },
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Admin"
        lede="Users, credits, usage, and maintenance controls — same operator shape as unofficial Jev hosts."
      />
      <AdminClient />
    </div>
  );
}
