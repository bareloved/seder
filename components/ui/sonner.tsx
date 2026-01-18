"use client";

import * as React from "react";
import { Toaster as SonnerToaster, ToasterProps } from "sonner";

/**
 * RTL-friendly toaster wrapper for app-wide notifications.
 * Keeps styling minimal and inherits project fonts.
 */
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      dir="rtl"
      position="bottom-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans",
          title: "font-semibold",
        },
      }}
      {...props}
    />
  );
}

