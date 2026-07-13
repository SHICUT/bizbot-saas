import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/welcome"
            className="px-6 py-2.5 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all text-sm"
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all text-sm"
          >
            Contact Us
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-10">FlowNex by Circle Creation</p>
      </div>
    </div>
  );
}
