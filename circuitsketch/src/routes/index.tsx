import { createFileRoute } from "@tanstack/react-router";
import CircuitEditor from "@/components/circuit/CircuitEditor";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Circuit Sketch — Minimalist Circuit Drawing Tool" },
      { name: "description", content: "A clean, distraction-free tool for sketching electrical circuits. Drag and drop components, draw wires, and add labels." },
    ],
  }),
});

function Index() {
  return <CircuitEditor />;
}
