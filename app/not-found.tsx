import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="heading-hero text-hairline-dark mb-4">404</p>
        <EmptyState message="сторінка не існує. Може вона була слопом, а може ще не народилась." className="py-6" />
        <Link href="/" className="btn-ghost text-on-primary">
          НА ГОЛОВНУ
        </Link>
      </div>
    </div>
  );
}
