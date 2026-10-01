import type { Metadata } from "next";
import { AccountClient } from "@/components/AccountClient";
import { PageTitle } from "@/components/PageTitle";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Laya account: register, create laya_ keys, buy prepaid packs, monitor usage, and configure burn alerts.",
  alternates: { canonical: canonical("/account/") },
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Account"
        lede="Register for a laya_ key, prepaid decide calls, and burn alerts — hosted System One without installing torch."
      />
      <AccountClient />
    </div>
  );
}
