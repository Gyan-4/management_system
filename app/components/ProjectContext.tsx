"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Project = { _id: string; name: string };
type ProjectContextValue = {
  projects: Project[];
  projectId: string;
  project: Project | null;
  setProjectId: (id: string) => void;
  loading: boolean;
  refreshProjects: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);
const STORAGE_KEY = "constructflow_project";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectIdState] = useState("");
  const [loading, setLoading] = useState(true);

  async function refreshProjects() {
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load projects.");
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const selected = saved && list.some((p: Project) => p._id === saved) ? saved : list[0]?._id || "";
      setProjectIdState(selected);
      if (selected) window.localStorage.setItem(STORAGE_KEY, selected);
      else window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshProjects();
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setProjectIdState(event.newValue || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setProjectId(id: string) {
    setProjectIdState(id);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: id || null }));
  }

  const value = useMemo(() => ({
    projects,
    projectId,
    project: projects.find(p => p._id === projectId) || null,
    setProjectId,
    loading,
    refreshProjects,
  }), [projects, projectId, loading]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used inside ProjectProvider");
  return context;
}
