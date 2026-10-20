import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <PageTitle
        section="Page not found"
        lede="That path is not on this site."
      />
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/" className="text-accent hover:underline">
          Home
        </Link>
        <Link href="/download/" className="text-accent hover:underline">
          Download
        </Link>
        <Link href="/pricing/" className="text-accent hover:underline">
          Pricing
        </Link>
        <Link href="/docs/api/" className="text-accent hover:underline">
          API Docs
        </Link>
      </nav>
    </div>
  );
}
