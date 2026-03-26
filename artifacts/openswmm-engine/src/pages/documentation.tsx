import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import cmake from "highlight.js/lib/languages/cmake";
import "highlight.js/styles/github-dark.min.css";
import { markdownContent } from "../content/how-openswmm-works";
import { useDarkMode } from "../hooks/use-dark-mode";

hljs.registerLanguage("c", c);
hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cmake", cmake);

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function buildToc(html: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /<h([23])\s+id="([^"]+)"[^>]*>(.*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[3].replace(/<[^>]+>/g, "");
    items.push({ id: match[2], text, level: parseInt(match[1]) });
  }
  return items;
}

export default function Documentation({ onNavigateFeatures }: { onNavigateFeatures: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackTop, setShowBackTop] = useState(false);
  const [dark, setDark] = useDarkMode();

  const renderedHtml = useMemo(() => {
    const renderer = new marked.Renderer();

    renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
      const slug = text
        .toLowerCase()
        .replace(/<[^>]+>/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      return `<h${depth} id="${slug}">${text}</h${depth}>`;
    };

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: false,
    });

    const html = marked.parse(markdownContent) as string;

    const div = document.createElement("div");
    div.innerHTML = html;
    div.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });

    return div.innerHTML;
  }, []);

  const toc = useMemo(() => buildToc(renderedHtml), [renderedHtml]);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    setShowBackTop(scrollTop > 400);

    const headings = document.querySelectorAll(".doc-content h2, .doc-content h3");
    let current = "";
    headings.forEach((h) => {
      const el = h as HTMLElement;
      if (el.getBoundingClientRect().top <= 80) {
        current = el.id;
      }
    });
    if (current !== activeId) {
      setActiveId(current);
    }
  }, [activeId]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setSidebarOpen(false);
    }
  };

  return (
    <div className="doc-wrapper">
      <div
        className="progress-bar"
        style={{ width: `${scrollProgress}%` }}
      />

      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation"
      >
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>

      <nav className={`doc-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button className="sidebar-back" onClick={onNavigateFeatures}>
            {"\u2190"} Back to Features
          </button>
          <h2>How OpenSWMM Works</h2>
          <div className="sidebar-sub">Technical Deep-Dive into the HydroCouple Engine</div>
          <span className="sidebar-badge">v6.0.0-alpha.1</span>
          <button
            className="dark-toggle"
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>
        </div>
        <ul className="toc-list">
          {toc.map((item) => (
            <li key={item.id}>
              <button
                className={`toc-item ${item.level === 3 ? "toc-sub" : ""} ${activeId === item.id ? "active" : ""}`}
                onClick={() => scrollToSection(item.id)}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="doc-main">
        <div
          ref={contentRef}
          className="doc-content"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
        <footer className="doc-footer">
          Generated from source code analysis of{" "}
          <a href="https://github.com/HydroCouple/openswmm.engine/tree/swmm6_rel" target="_blank" rel="noopener noreferrer">
            HydroCouple/openswmm.engine@swmm6_rel
          </a>
          , March 2026. {"\u2022"}{" "}
          Comparison baseline:{" "}
          <a href="https://github.com/USEPA/Stormwater-Management-Model" target="_blank" rel="noopener noreferrer">
            EPA SWMM 5.2.4
          </a>{" "}
          {"\u2022"}{" "}
          Built for{" "}
          <a href="https://swmm5.org" target="_blank" rel="noopener noreferrer">
            SWMM5.org
          </a>
        </footer>
      </main>

      {showBackTop && (
        <button
          className="back-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          {"\u2191"}
        </button>
      )}
    </div>
  );
}
