import { CircuitEditor } from "@/CircuitEditor";
import { Header } from "@/ui/Header";

export default function App() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Header />
      <CircuitEditor />
    </div>
  );
}
