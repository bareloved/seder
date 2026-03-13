"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">משהו השתבש</h1>
          <p className="text-gray-600 mb-6">אירעה שגיאה בלתי צפויה. נסו שוב.</p>
          <button
            onClick={reset}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
