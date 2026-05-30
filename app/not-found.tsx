import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="heading-hero text-hairline-dark mb-4">404</p>
        <p className="heading-sub mb-6">БРЄДІК В ЧАТ НЄ ПІШЕМ</p>
        <p className="text-on-primary-mute text-lg mb-8 max-w-md mx-auto">
          Ця сторінка не існує. Може вона була слопом, а може ще не народилась.
        </p>
        <Link href="/" className="btn-ghost text-on-primary">
          НА ГОЛОВНУ
        </Link>
      </div>
    </div>
  );
}
