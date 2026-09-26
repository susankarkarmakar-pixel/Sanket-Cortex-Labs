export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  status: "active" | "complete";
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const PROJECTS_KEY = "susan_workspace_projects_v1";
const NOTES_KEY = "susan_knowledge_notes_v1";
const UPDATED_EVENT = "workspace-data-updated";

export function getProjects(): WorkspaceProject[] {
  return readArray<WorkspaceProject>(PROJECTS_KEY, isProject).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProject(input: Pick<WorkspaceProject, "name" | "description">, id?: string): WorkspaceProject {
  const name = input.name.trim().slice(0, 100);
  const description = input.description.trim().slice(0, 500);
  if (!name) throw new Error("Give the project a name first.");
  const projects = getProjects();
  const now = Date.now();
  const previous = id ? projects.find((project) => project.id === id) : undefined;
  const project: WorkspaceProject = previous
    ? { ...previous, name, description, updatedAt: now }
    : { id: makeId(), name, description, status: "active", createdAt: now, updatedAt: now };
  writeArray(PROJECTS_KEY, previous ? projects.map((item) => item.id === id ? project : item) : [project, ...projects]);
  return project;
}

export function setProjectStatus(id: string, status: WorkspaceProject["status"]): void {
  writeArray(PROJECTS_KEY, getProjects().map((project) => project.id === id ? { ...project, status, updatedAt: Date.now() } : project));
}

export function deleteProject(id: string): void {
  writeArray(PROJECTS_KEY, getProjects().filter((project) => project.id !== id));
}

export function getKnowledgeNotes(): KnowledgeNote[] {
  return readArray<KnowledgeNote>(NOTES_KEY, isNote).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveKnowledgeNote(input: Pick<KnowledgeNote, "title" | "content" | "tags">, id?: string): KnowledgeNote {
  const title = input.title.trim().slice(0, 120);
  const content = input.content.trim().slice(0, 20_000);
  const tags = [...new Set(input.tags.map((tag) => tag.trim().slice(0, 32)).filter(Boolean))].slice(0, 8);
  if (!title || !content) throw new Error("A note needs both a title and some content.");
  const notes = getKnowledgeNotes();
  const now = Date.now();
  const previous = id ? notes.find((note) => note.id === id) : undefined;
  const note: KnowledgeNote = previous
    ? { ...previous, title, content, tags, updatedAt: now }
    : { id: makeId(), title, content, tags, createdAt: now, updatedAt: now };
  writeArray(NOTES_KEY, previous ? notes.map((item) => item.id === id ? note : item) : [note, ...notes]);
  return note;
}

export function deleteKnowledgeNote(id: string): void {
  writeArray(NOTES_KEY, getKnowledgeNotes().filter((note) => note.id !== id));
}

function readArray<T>(key: string, guard: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(UPDATED_EVENT));
  } catch {
    throw new Error("Browser storage is full. Remove some saved items and try again.");
  }
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isProject(value: unknown): value is WorkspaceProject {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WorkspaceProject>;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.description === "string" && (item.status === "active" || item.status === "complete") && Number.isFinite(item.createdAt) && Number.isFinite(item.updatedAt);
}

function isNote(value: unknown): value is KnowledgeNote {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<KnowledgeNote>;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string" && Array.isArray(item.tags) && Number.isFinite(item.createdAt) && Number.isFinite(item.updatedAt);
}
