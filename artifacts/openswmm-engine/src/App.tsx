import { useState } from "react";
import Documentation from "@/pages/documentation";
import Features from "@/pages/features";
import Simulator from "@/pages/simulator";

type Page = "features" | "docs" | "simulator";

function App() {
  const [page, setPage] = useState<Page>("features");

  if (page === "docs") {
    return <Documentation onNavigateFeatures={() => setPage("features")} />;
  }

  if (page === "simulator") {
    return <Simulator onNavigateFeatures={() => setPage("features")} />;
  }

  return <Features onNavigateDocs={() => setPage("docs")} onNavigateSimulator={() => setPage("simulator")} />;
}

export default App;
