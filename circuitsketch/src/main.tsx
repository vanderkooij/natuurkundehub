import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CircuitEditor from "@/components/circuit/CircuitEditor";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CircuitEditor />
  </StrictMode>
);
