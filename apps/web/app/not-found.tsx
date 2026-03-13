import Link from "next/link";

export default function NotFound() {
  return (
    <div dir="rtl" className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center px-4">
        <h2 className="text-4xl font-bold text-gray-900 mb-2">404</h2>
        <p className="text-gray-600 mb-6">העמוד לא נמצא</p>
        <Link
          href="/"
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors inline-block"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
