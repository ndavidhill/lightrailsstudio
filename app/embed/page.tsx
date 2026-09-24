import type { Metadata } from "next";
import { EmbedView } from "@/components/EmbedView";

export const metadata: Metadata = {
  title: "Light Rails",
  robots: { index: false },
};

export default function EmbedPage() {
  return <EmbedView />;
}
