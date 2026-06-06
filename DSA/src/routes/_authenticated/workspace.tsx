import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { runCode, aiChat } from "@/lib/ai.functions";
import { createWorkspaceFile, createWorkspaceFolder, deleteWorkspaceFile, deleteWorkspaceFolder, getWorkspaceTree, listWorkspaces, updateWorkspaceFile, updateWorkspaceFolder } from "@/lib/workspace.functions";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, FileCode, FilePlus2, Folder, FolderOpen, FolderPlus, Loader2, PanelBottom, PanelLeft, PanelRight, Pencil, Play, Plus, Save, Sparkles, Trash2, X, Tag, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace")({ component: Workspace });

const LANGS = ["javascript", "typescript", "python", "java", "cpp", "c", "go", "ruby", "rust", "html", "css", "sql"];
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

type ColorTag = "red" | "yellow" | "green" | "blue" | "purple" | null;
interface FileRow { id: string; name: string; language: string; content: string; folder_id: string | null; workspace_id: string; color_tag?: ColorTag; }
interface FolderRow { id: string; name: string; parent_id?: string | null; color_tag?: ColorTag; }
interface FolderNode extends FolderRow { folders: FolderNode[]; files: FileRow[]; }

const COLOR_OPTIONS: { value: Exclude<ColorTag, null>; label: string; dot: string; ring: string }[] = [
  { value: "red", label: "Hard / Revise often", dot: "bg-rose-500", ring: "ring-rose-500/60" },
  { value: "yellow", label: "Medium / Revisit", dot: "bg-amber-400", ring: "ring-amber-400/60" },
  { value: "green", label: "Easy / Mastered", dot: "bg-emerald-500", ring: "ring-emerald-500/60" },
  { value: "blue", label: "Important concept", dot: "bg-sky-500", ring: "ring-sky-500/60" },
  { value: "purple", label: "Interview favourite", dot: "bg-fuchsia-500", ring: "ring-fuchsia-500/60" },
];
const colorDot = (c: ColorTag) => COLOR_OPTIONS.find((x) => x.value === c)?.dot ?? "";

function DragHandle({ axis, onPointerDown, accent = "indigo" }: { axis: "x" | "y"; onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void; accent?: "indigo" | "pink" }) {
  const isX = axis === "x";
  return (
    <div
      role="separator"
      aria-orientation={isX ? "vertical" : "horizontal"}
      title={isX ? "Drag to resize width" : "Drag to resize height"}
      onPointerDown={onPointerDown}
      className={`group relative z-20 shrink-0 touch-none select-none ${isX ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize"}`}
    >
      <div className={`absolute bg-slate-800 transition-colors ${accent === "pink" ? "group-hover:bg-pink-500" : "group-hover:bg-indigo-500"} ${isX ? "inset-y-0 left-1/2 w-px -translate-x-1/2 group-hover:w-1" : "inset-x-0 top-1/2 h-px -translate-y-1/2 group-hover:h-1"}`} />
      <div className={`absolute rounded-full border border-slate-700 bg-slate-900 ${isX ? "left-1/2 top-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2" : "left-1/2 top-1/2 h-1.5 w-8 -translate-x-1/2 -translate-y-1/2"}`} />
    </div>
  );
}

function Workspace() {
  const { profile } = useAuth();
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [wsId, setWsId] = useState<string>("");
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<{ stdout: string; stderr: string; status: string; time: number | null } | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showAi, setShowAi] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(18);
  const [terminalHeight, setTerminalHeight] = useState(32);
  const [aiWidth, setAiWidth] = useState(26);
  const [aiMsg, setAiMsg] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [revisionFilter, setRevisionFilter] = useState<ColorTag>(null);
  const [colorPickerFor, setColorPickerFor] = useState<{ type: "file" | "folder"; id: string } | null>(null);
  const runFn = useServerFn(runCode);
  const aiFn = useServerFn(aiChat);
  const listWsFn = useServerFn(listWorkspaces);
  const treeFn = useServerFn(getWorkspaceTree);
  const createFileFn = useServerFn(createWorkspaceFile);
  const createFolderFn = useServerFn(createWorkspaceFolder);
  const updateFileFn = useServerFn(updateWorkspaceFile);
  const updateFolderFn = useServerFn(updateWorkspaceFolder);
  const deleteFileFn = useServerFn(deleteWorkspaceFile);
  const deleteFolderFn = useServerFn(deleteWorkspaceFolder);
  const saveTimer = useRef<any>(null);
  const mainAreaRef = useRef<HTMLDivElement | null>(null);
  const editorStackRef = useRef<HTMLDivElement | null>(null);

  const active = files.find((f) => f.id === activeId);
  // Natural sort so "10.foo" comes after "9.foo", not after "1.foo"
  const natCmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  const rootFiles = useMemo(() => files.filter((file) => !file.folder_id).sort((a, b) => natCmp(a.name, b.name)), [files]);
  const folderTree = useMemo(() => {
    const nodes = new Map<string, FolderNode>();
    folders.forEach((folder) => nodes.set(folder.id, { ...folder, folders: [], files: [] }));
    files.forEach((file) => {
      if (!file.folder_id) return;
      nodes.get(file.folder_id)?.files.push(file);
    });
    const roots: FolderNode[] = [];
    nodes.forEach((node) => {
      if (node.parent_id && nodes.has(node.parent_id)) nodes.get(node.parent_id)!.folders.push(node);
      else roots.push(node);
    });
    const sortNode = (node: FolderNode) => {
      node.folders.sort((a, b) => natCmp(a.name, b.name));
      node.files.sort((a, b) => natCmp(a.name, b.name));
      node.folders.forEach(sortNode);
    };
    roots.sort((a, b) => natCmp(a.name, b.name));
    roots.forEach(sortNode);
    return roots;
  }, [folders, files]);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { workspaces: ws } = await listWsFn();
      setWorkspaces((ws as any[]) ?? []);
      if (ws && ws.length) setWsId((ws[0] as any).id);
    })();
  }, [profile?.id]);

  useEffect(() => {
    if (!wsId) return;
    (async () => {
      const { files: loadedFiles, folders: loadedFolders } = await treeFn({ data: { workspace_id: wsId } });
      const nextFiles = (loadedFiles as FileRow[]) ?? [];
      const nextFolders = (loadedFolders as FolderRow[]) ?? [];
      setFiles(nextFiles);
      setFolders(nextFolders);
      setExpandedFolders(Object.fromEntries(nextFolders.map((folder) => [folder.id, true])));
      if (nextFiles.length && !nextFiles.some((f) => f.id === activeId)) {
        setActiveId(nextFiles[0].id);
        setContent(nextFiles[0].content);
        setSelectedFolderId(nextFiles[0].folder_id ?? null);
      }
    })();
  }, [wsId]);

  function openFile(f: FileRow) { setActiveId(f.id); setSelectedFolderId(f.folder_id ?? null); setContent(f.content); setOutput(null); }

  function selectFolder(folderId: string | null) {
    setSelectedFolderId(folderId);
    if (folderId) setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
  }

  async function saveActive(c?: string) {
    if (!active) return;
    setSaving(true);
    const newContent = c ?? content;
    await updateFileFn({ data: { id: active.id, content: newContent } });
    setFiles((prev) => prev.map((f) => f.id === active.id ? { ...f, content: newContent } : f));
    setSaving(false);
  }

  function onChange(v: string | undefined) {
    const val = v ?? "";
    setContent(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveActive(val), 1500);
  }

  async function run() {
    if (!active) { toast.error("Open a file first"); return; }
    setShowTerminal(true);
    setRunning(true); setOutput(null);
    try {
      const r = await runFn({ data: { language: active.language, code: content, stdin, file_id: active.id } });
      setOutput(r);
      toast.success(r.status);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setRunning(false); }
  }

  async function newFile(folderId = selectedFolderId) {
    if (!wsId) return;
    const name = prompt("File name (e.g. solution.py):", "untitled.js");
    if (!name) return;
    try {
      const { file } = await createFileFn({ data: { workspace_id: wsId, folder_id: folderId, name } });
      setFiles((p) => [...p, file as FileRow]);
      if (folderId) setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
      openFile(file as FileRow);
      toast.success("File created");
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteFile(id: string) {
    if (!confirm("Delete this file?")) return;
    try {
      await deleteFileFn({ data: { id } });
      setFiles((p) => p.filter((f) => f.id !== id));
      if (activeId === id) { setActiveId(""); setContent(""); }
      toast.success("File deleted");
    } catch (e: any) { toast.error(e.message); }
  }

  async function renameFile(file: FileRow) {
    const name = prompt("Rename file:", file.name);
    if (!name || name === file.name) return;
    try {
      const { file: updated } = await updateFileFn({ data: { id: file.id, name } });
      setFiles((p) => p.map((item) => item.id === file.id ? updated as FileRow : item));
      toast.success("File renamed");
    } catch (e: any) { toast.error(e.message); }
  }

  async function moveFile(fileId: string, folderId: string | null) {
    try {
      const { file } = await updateFileFn({ data: { id: fileId, folder_id: folderId } });
      setFiles((p) => p.map((item) => item.id === fileId ? file as FileRow : item));
      if (folderId) setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
      toast.success("File moved");
    } catch (e: any) { toast.error(e.message); }
  }

  async function newFolder(parentId = selectedFolderId) {
    if (!wsId) return;
    const name = prompt("Folder name:");
    if (!name) return;
    try {
      const { folder } = await createFolderFn({ data: { workspace_id: wsId, parent_id: parentId, name } });
      if (folder) {
        setFolders((p) => [...p, folder as FolderRow]);
        if (parentId) setExpandedFolders((prev) => ({ ...prev, [parentId]: true }));
        setExpandedFolders((prev) => ({ ...prev, [(folder as FolderRow).id]: true }));
        setSelectedFolderId((folder as FolderRow).id);
      }
      toast.success("Folder created");
    } catch (e: any) { toast.error(e.message); }
  }

  async function renameFolder(folder: FolderRow) {
    const name = prompt("Rename folder:", folder.name);
    if (!name || name === folder.name) return;
    try {
      const { folder: updated } = await updateFolderFn({ data: { id: folder.id, name } });
      setFolders((p) => p.map((item) => item.id === folder.id ? updated as FolderRow : item));
      toast.success("Folder renamed");
    } catch (e: any) { toast.error(e.message); }
  }

  async function moveFolder(folderId: string, parentId: string | null) {
    try {
      const { folder } = await updateFolderFn({ data: { id: folderId, parent_id: parentId } });
      setFolders((p) => p.map((item) => item.id === folderId ? folder as FolderRow : item));
      if (parentId) setExpandedFolders((prev) => ({ ...prev, [parentId]: true }));
      toast.success("Folder moved");
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteFolder(folderId: string) {
    if (!confirm("Delete this folder and move its files to root? Subfolders will also be deleted.")) return;
    try {
      await deleteFolderFn({ data: { id: folderId } });
      const childFolderIds = new Set<string>([folderId]);
      let changed = true;
      while (changed) {
        changed = false;
        folders.forEach((folder) => {
          if (folder.parent_id && childFolderIds.has(folder.parent_id) && !childFolderIds.has(folder.id)) {
            childFolderIds.add(folder.id);
            changed = true;
          }
        });
      }
      setFolders((p) => p.filter((folder) => !childFolderIds.has(folder.id)));
      setFiles((p) => p.map((file) => childFolderIds.has(file.folder_id ?? "") ? { ...file, folder_id: null } : file));
      if (childFolderIds.has(selectedFolderId ?? "")) setSelectedFolderId(null);
      toast.success("Folder deleted");
    } catch (e: any) { toast.error(e.message); }
  }

  async function askAi(mode: "chat" | "explain" | "fix" | "review" | "optimize") {
    setShowAi(true);
    setAiBusy(true); setAiReply("");
    try {
      const defaults: Record<typeof mode, string> = {
        chat: "Help me with this",
        explain: "Explain this code",
        fix: "Find and fix bugs",
        review: "Review this code",
        optimize: "Give brute, better and optimal solutions for this problem",
      } as any;
      const r = await aiFn({
        data: {
          message: aiMsg || defaults[mode],
          context_code: active?.content,
          mode,
        },
      });
      setAiReply(r.reply);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiBusy(false); }
  }

  async function setFileColor(fileId: string, color: ColorTag) {
    try {
      const { file } = await updateFileFn({ data: { id: fileId, color_tag: color } });
      setFiles((p) => p.map((f) => f.id === fileId ? { ...f, color_tag: (file as any).color_tag } : f));
      setColorPickerFor(null);
    } catch (e: any) { toast.error(e.message); }
  }
  async function setFolderColor(folderId: string, color: ColorTag) {
    try {
      const { folder } = await updateFolderFn({ data: { id: folderId, color_tag: color } });
      setFolders((p) => p.map((f) => f.id === folderId ? { ...f, color_tag: (folder as any).color_tag } : f));
      setColorPickerFor(null);
    } catch (e: any) { toast.error(e.message); }
  }

  function beginResize(kind: "sidebar" | "terminal" | "ai", e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const cursor = kind === "terminal" ? "row-resize" : "col-resize";
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";

    const onMove = (event: PointerEvent) => {
      if (kind === "terminal") {
        const rect = editorStackRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTerminalHeight(clamp(((rect.bottom - event.clientY) / rect.height) * 100, 16, 72));
        return;
      }

      const rect = mainAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (kind === "sidebar") setSidebarWidth(clamp(((event.clientX - rect.left) / rect.width) * 100, 12, 38));
      if (kind === "ai") setAiWidth(clamp(((rect.right - event.clientX) / rect.width) * 100, 18, 48));
    };

    const stop = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  function handleDragStart(e: DragEvent<HTMLElement>, payload: { type: "file" | "folder"; id: string }) {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  async function handleDrop(e: DragEvent<HTMLElement>, folderId: string | null) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const payload = JSON.parse(raw) as { type: "file" | "folder"; id: string };
    if (payload.type === "file") await moveFile(payload.id, folderId);
    if (payload.type === "folder") await moveFolder(payload.id, folderId);
  }

  const colorMenu = (target: { type: "file" | "folder"; id: string }, current: ColorTag) => (
    <div className="absolute right-0 top-6 z-30 flex gap-1 rounded border border-slate-700 bg-slate-900 p-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
      {COLOR_OPTIONS.map((c) => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => target.type === "file" ? setFileColor(target.id, c.value) : setFolderColor(target.id, c.value)}
          className={`h-4 w-4 rounded-full ${c.dot} ${current === c.value ? "ring-2 ring-white" : "hover:ring-2 hover:ring-slate-500"}`}
        />
      ))}
      <button
        title="Clear color"
        onClick={() => target.type === "file" ? setFileColor(target.id, null) : setFolderColor(target.id, null)}
        className="h-4 w-4 rounded-full border border-slate-600 text-[8px] text-slate-400 hover:bg-slate-800"
      >×</button>
    </div>
  );

  const matchesRevisionFilter = (color: ColorTag) => !revisionFilter || color === revisionFilter;

  const renderFile = (file: FileRow, depth = 0) => {
    if (!matchesRevisionFilter(file.color_tag ?? null)) return null;
    const picking = colorPickerFor?.type === "file" && colorPickerFor.id === file.id;
    return (
      <div
        key={file.id}
        draggable
        onDragStart={(e) => handleDragStart(e, { type: "file", id: file.id })}
        className={`group relative flex min-h-8 items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer ${activeId === file.id ? "bg-indigo-600/40 text-white" : "text-slate-300 hover:bg-slate-800"} ${file.color_tag ? `ring-1 ring-inset ${COLOR_OPTIONS.find(c=>c.value===file.color_tag)?.ring ?? ""}` : ""}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => openFile(file)}
        onDoubleClick={() => renameFile(file)}
      >
        {file.color_tag && <span className={`h-2 w-2 shrink-0 rounded-full ${colorDot(file.color_tag)}`} />}
        <FileCode size={13} className="shrink-0 text-slate-500" />
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <button onClick={(e) => { e.stopPropagation(); setColorPickerFor(picking ? null : { type: "file", id: file.id }); }} title="Tag color for revision" className="rounded p-1 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 sm:opacity-0 sm:group-hover:opacity-100"><Tag size={11} /></button>
        <button onClick={(e) => { e.stopPropagation(); renameFile(file); }} title="Rename file" className="rounded p-1 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 sm:opacity-0 sm:group-hover:opacity-100">
          <Pencil size={11} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} title="Delete file" className="rounded p-1 text-red-400 opacity-100 hover:bg-red-950/60 sm:opacity-0 sm:group-hover:opacity-100">
          <Trash2 size={11} />
        </button>
        {picking && colorMenu({ type: "file", id: file.id }, file.color_tag ?? null)}
      </div>
    );
  };

  const renderFolder = (folder: FolderNode, depth = 0) => {
    const expanded = expandedFolders[folder.id] ?? true;
    const selected = selectedFolderId === folder.id;
    const dropTarget = dragOverFolderId === folder.id;
    const picking = colorPickerFor?.type === "folder" && colorPickerFor.id === folder.id;
    // When a revision filter is on, hide a folder if neither it nor any descendant matches
    if (revisionFilter) {
      const anyMatch = (n: FolderNode): boolean =>
        n.color_tag === revisionFilter ||
        n.files.some((f) => f.color_tag === revisionFilter) ||
        n.folders.some(anyMatch);
      if (!anyMatch(folder)) return null;
    }
    return (
      <div key={folder.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, { type: "folder", id: folder.id })}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolderId(folder.id); }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => handleDrop(e, folder.id)}
          onClick={() => selectFolder(folder.id)}
          onDoubleClick={() => setExpandedFolders((prev) => ({ ...prev, [folder.id]: !expanded }))}
          className={`group relative flex min-h-8 items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer ${selected ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70"} ${dropTarget ? "ring-1 ring-indigo-400" : ""} ${folder.color_tag ? `ring-1 ring-inset ${COLOR_OPTIONS.find(c=>c.value===folder.color_tag)?.ring ?? ""}` : ""}`}
          style={{ paddingLeft: `${6 + depth * 14}px` }}
        >
          <button onClick={(e) => { e.stopPropagation(); setExpandedFolders((prev) => ({ ...prev, [folder.id]: !expanded })); }} className="rounded p-0.5 text-slate-500 hover:bg-slate-700 hover:text-slate-100">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          {folder.color_tag && <span className={`h-2 w-2 shrink-0 rounded-full ${colorDot(folder.color_tag)}`} />}
          {expanded ? <FolderOpen size={14} className="shrink-0 text-amber-400" /> : <Folder size={14} className="shrink-0 text-amber-400" />}
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          <button onClick={(e) => { e.stopPropagation(); setColorPickerFor(picking ? null : { type: "folder", id: folder.id }); }} title="Tag color for revision" className="rounded p-1 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 sm:opacity-0 sm:group-hover:opacity-100"><Tag size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); newFile(folder.id); }} title="New file in folder" className="rounded p-1 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 sm:opacity-0 sm:group-hover:opacity-100"><FilePlus2 size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); newFolder(folder.id); }} title="New folder inside" className="rounded p-1 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 sm:opacity-0 sm:group-hover:opacity-100"><FolderPlus size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); renameFolder(folder); }} title="Rename folder" className="rounded p-1 text-slate-400 opacity-100 hover:bg-slate-700 hover:text-slate-100 sm:opacity-0 sm:group-hover:opacity-100"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} title="Delete folder" className="rounded p-1 text-red-400 opacity-100 hover:bg-red-950/60 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={11} /></button>
          {picking && colorMenu({ type: "folder", id: folder.id }, folder.color_tag ?? null)}
        </div>
        {expanded && (
          <div>
            {folder.folders.map((child) => renderFolder(child, depth + 1))}
            {folder.files.map((childFile) => renderFile(childFile, depth + 1))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top toolbar */}
      <div className="border-b border-slate-800 px-3 py-1.5 flex items-center gap-2 bg-slate-900 shrink-0">
        <button onClick={() => setShowSidebar(!showSidebar)} title="Toggle file tree"
          className={`p-1.5 rounded hover:bg-slate-800 ${showSidebar ? "text-indigo-400" : "text-slate-400"}`}>
          <PanelLeft size={15} />
        </button>
        <button onClick={() => setShowTerminal(!showTerminal)} title="Toggle terminal"
          className={`p-1.5 rounded hover:bg-slate-800 ${showTerminal ? "text-indigo-400" : "text-slate-400"}`}>
          <PanelBottom size={15} />
        </button>
        <button onClick={() => setShowAi(!showAi)} title="Toggle AI"
          className={`p-1.5 rounded hover:bg-slate-800 ${showAi ? "text-pink-400" : "text-slate-400"}`}>
          <PanelRight size={15} />
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <select value={wsId} onChange={(e) => setWsId(e.target.value)} className="bg-slate-800 px-2 py-1 rounded text-xs">
          {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => saveActive()} disabled={!active || saving} className="px-3 py-1 bg-slate-700 text-xs rounded flex items-center gap-1 hover:bg-slate-600 disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
        </button>
        <button onClick={run} disabled={!active || running} className="px-3 py-1 bg-emerald-600 text-xs rounded flex items-center gap-1 hover:bg-emerald-500 disabled:opacity-50">
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run
        </button>
        <button onClick={() => askAi("chat")} className="px-3 py-1 bg-pink-600 text-xs rounded flex items-center gap-1 hover:bg-pink-500">
          <Sparkles size={12} /> AI
        </button>
      </div>

      {/* Main resizable area */}
      <div ref={mainAreaRef} className="flex-1 min-h-0 overflow-hidden flex">
        {showSidebar && (
          <>
            <aside style={{ width: `${sidebarWidth}%` }} className="h-full min-w-[150px] max-w-[460px] shrink-0 bg-slate-900/30">
              <div className="h-full flex flex-col">
                <div className="p-2 flex gap-1 border-b border-slate-800 shrink-0">
                  <button onClick={() => newFile()} className="flex-1 text-xs py-1 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-1"><Plus size={11} /> File</button>
                  <button onClick={() => newFolder()} className="flex-1 text-xs py-1 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center gap-1"><FolderPlus size={11} /> Folder</button>
                </div>
                <div className="px-2 py-1.5 border-b border-slate-800 shrink-0">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between">
                    <span>Revision filter</span>
                    {revisionFilter && <button onClick={() => setRevisionFilter(null)} className="text-slate-400 hover:text-white text-[10px]">clear</button>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setRevisionFilter(null)} className={`text-[10px] px-2 py-0.5 rounded border ${!revisionFilter ? "border-slate-400 text-slate-100" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>All</button>
                    {COLOR_OPTIONS.map((c) => (
                      <button key={c.value} onClick={() => setRevisionFilter(c.value)} title={c.label}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${revisionFilter === c.value ? "border-white text-white" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                        <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.value}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className={`flex-1 overflow-y-auto p-1 ${dragOverFolderId === "root" ? "ring-1 ring-inset ring-indigo-400" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolderId("root"); }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => handleDrop(e, null)}
                  onClick={(e) => { if (e.currentTarget === e.target) selectFolder(null); }}
                >
                  <button
                    onClick={() => selectFolder(null)}
                    className={`mb-1 flex min-h-8 w-full items-center gap-1 rounded px-2 py-1 text-left text-xs ${selectedFolderId === null ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:bg-slate-800/70"}`}
                  >
                    <FolderOpen size={13} className="text-amber-400" /> Workspace root
                  </button>
                  {folderTree.map((folder) => renderFolder(folder))}
                  {rootFiles.map((file) => renderFile(file))}
                  {files.length === 0 && folders.length === 0 && <div className="text-xs text-slate-500 p-3">No files. Click File or Folder.</div>}
                </div>
              </div>
            </aside>
            <DragHandle axis="x" onPointerDown={(e) => beginResize("sidebar", e)} />
          </>
        )}

        <section ref={editorStackRef} className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <div style={{ height: showTerminal ? `${100 - terminalHeight}%` : "100%" }} className="min-h-0 overflow-hidden">
            {active ? (
              <div className="h-full flex flex-col">
                <div className="px-3 py-1 border-b border-slate-800 text-xs flex items-center gap-2 bg-slate-900/50 shrink-0">
                  <FileCode size={12} className="text-indigo-400" />
                  <span className="text-slate-200">{active.name}</span>
                  <select value={active.language}
                    onChange={async (e) => {
                      const lang = e.target.value;
                      await updateFileFn({ data: { id: active.id, language: lang } });
                      setFiles((p) => p.map((f) => f.id === active.id ? { ...f, language: lang } : f));
                    }}
                    className="bg-slate-800 px-1 rounded text-xs ml-auto">
                    {LANGS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    language={active.language}
                    value={content}
                    theme="vs-dark"
                    onChange={onChange}
                    options={{ minimap: { enabled: true }, fontSize: 13, automaticLayout: true, tabSize: 2, scrollBeyondLastLine: false }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Select or create a file to start coding</div>
            )}
          </div>

          {showTerminal && (
            <>
              <DragHandle axis="y" onPointerDown={(e) => beginResize("terminal", e)} />
              <div style={{ height: `${terminalHeight}%` }} className="min-h-[120px] max-h-[72%] shrink-0 overflow-hidden">
                <div className="h-full flex bg-slate-900">
                  <div className="w-1/3 min-w-[130px] border-r border-slate-800 p-2 flex flex-col">
                    <div className="text-xs text-slate-400 mb-1 shrink-0">stdin</div>
                    <textarea value={stdin} onChange={(e) => setStdin(e.target.value)}
                      placeholder="Input for your program..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono resize-none" />
                  </div>
                  <div className="flex-1 p-2 overflow-auto flex flex-col">
                    <div className="text-xs text-slate-400 mb-1 shrink-0 flex items-center gap-2">
                      <span>Terminal</span>
                      {output && <span className={output.stderr ? "text-red-400" : "text-emerald-400"}>• {output.status} {output.time !== null && `(${output.time}s)`}</span>}
                    </div>
                    {output ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap flex-1">
                        {output.stdout && <span className="text-slate-200">{output.stdout}</span>}
                        {output.stderr && <span className="text-red-400">{output.stderr}</span>}
                      </pre>
                    ) : <div className="text-xs text-slate-600">Click Run to execute. Drag the divider above to resize.</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {showAi && (
          <>
            <DragHandle axis="x" accent="pink" onPointerDown={(e) => beginResize("ai", e)} />
            <aside style={{ width: `${aiWidth}%` }} className="h-full min-w-[190px] max-w-[560px] shrink-0 bg-slate-900/50">
              <div className="h-full flex flex-col">
                <div className="p-2 border-b border-slate-800 flex justify-between items-center shrink-0">
                  <div className="font-semibold text-sm flex items-center gap-1"><Sparkles size={14} className="text-pink-400" /> AI Assistant</div>
                  <button onClick={() => setShowAi(false)} className="text-slate-400 hover:text-slate-200"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 shrink-0">
                  <button onClick={() => askAi("explain")} disabled={aiBusy} className="text-xs py-1.5 bg-indigo-600/30 hover:bg-indigo-600 rounded">Explain</button>
                  <button onClick={() => askAi("fix")} disabled={aiBusy} className="text-xs py-1.5 bg-amber-600/30 hover:bg-amber-600 rounded">Fix bugs</button>
                  <button onClick={() => askAi("review")} disabled={aiBusy} className="text-xs py-1.5 bg-purple-600/30 hover:bg-purple-600 rounded">Review</button>
                  <button onClick={() => askAi("chat")} disabled={aiBusy} className="text-xs py-1.5 bg-pink-600/30 hover:bg-pink-600 rounded">Ask</button>
                  <button onClick={() => askAi("optimize")} disabled={aiBusy} className="col-span-2 text-xs py-1.5 bg-emerald-600/30 hover:bg-emerald-600 rounded flex items-center justify-center gap-1"><Zap size={11} /> Brute → Better → Optimal</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 text-sm">
                  {aiBusy && <div className="text-slate-400 flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Thinking…</div>}
                  {aiReply && <pre className="whitespace-pre-wrap text-xs text-slate-200">{aiReply}</pre>}
                  {!aiBusy && !aiReply && <div className="text-xs text-slate-500">Ask anything about your code.</div>}
                </div>
                <div className="p-2 border-t border-slate-800 shrink-0">
                  <textarea value={aiMsg} onChange={(e) => setAiMsg(e.target.value)} placeholder="Ask AI..."
                    className="w-full h-16 bg-slate-950 border border-slate-800 rounded p-2 text-xs resize-none" />
                  <button onClick={() => askAi("chat")} disabled={aiBusy || !aiMsg} className="w-full mt-1 py-1.5 bg-pink-600 hover:bg-pink-500 rounded text-xs disabled:opacity-50">Send</button>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
