import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function getSession() {
  const token = (await cookies()).get("constructflow_session")?.value;
  return token ? verifySession(token) : null;
}

export function canManageAllProjects(role: string) {
  return role === "Admin" || role === "Engineer";
}

export function canAccessProject(role: string, projectManagerId: unknown, sessionId: string) {
  if (role === "Admin" || role === "Engineer") return true;
  return role === "Project Manager" && String(projectManagerId || "") === sessionId;
}

export function canEditProjectData(role: string, projectManagerId: unknown, sessionId: string) {
  return canAccessProject(role, projectManagerId, sessionId);
}
