import { DesignTestClient } from "./DesignTestClient";

// Force dynamic rendering - design test page
export const dynamic = "force-dynamic";

export default function DesignTestPage() {
  return <DesignTestClient />;
}
