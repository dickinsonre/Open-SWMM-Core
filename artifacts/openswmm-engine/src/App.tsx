import { useState } from "react";
import Documentation from "@/pages/documentation";
import Features from "@/pages/features";

function App() {
  const [page, setPage] = useState<"features" | "docs">("features");

  if (page === "docs") {
    return <Documentation onNavigateFeatures={() => setPage("features")} />;
  }

  return <Features onNavigateDocs={() => setPage("docs")} />;
}

export default App;
