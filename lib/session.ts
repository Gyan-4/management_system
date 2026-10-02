import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function getSession() {
  const token = (await cookies()).get("constructflow_session")?.value;
  return token ? verifySession(token) : null;
}

export function canManageAllProjects(role: string) {
  return role === "Admin" || role === "Engineer";
}

export function canAccessProject(role: string, _projectManagerId: unknown, _sessionId: string) {
  return role === "Admin" || role === "Engineer";
}

export function canEditProjectData(role: string, _projectManagerId: unknown, _sessionId: string) {
  return role === "Admin" || role === "Engineer";
}
