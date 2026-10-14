import { Editor } from "@/bord/Editor";
import { Header } from "@/ui/Header";

export default function App() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Header />
      <Editor />
    </div>
  );
}
