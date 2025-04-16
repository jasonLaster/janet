import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-lg mb-8">
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Go back home
      </Link>
    </div>
  );
}
