"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCode2, FolderOpen, Play, Plus } from "lucide-react";

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  running?: boolean;
};

type Library = {
  name: string;
  version: string;
  pending?: boolean;
};

type Browse = {
  path: string;
  parent: string | null;
  dirs: string[];
  venvs: string[];
  files: string[];
  isVenv: boolean;
};

type Props = {
  root: string;
  pythonPath: string;
  labPython: string;
  labPythonVersion: string;
  venv: string;
  venvs: string[];
  files: string[];
  packages: Library[];
  initialName: string;
  initialSource: string;
};

export function PythonLab({
  root,
  pythonPath,
  labPython: initialLabPython,
  labPythonVersion: initialLabPythonVersion,
  venv,
  venvs: initialVenvs,
  files: initialFiles,
  packages: initialPackages,
  initialName,
  initialSource,
}: Props) {
  const router = useRouter();
  const gutterRef = useRef<HTMLPreElement>(null);
  const [folder, setFolder] = useState(root);
  const [python, setPython] = useState(pythonPath);
  const [labPython, setLabPython] = useState(initialLabPython);
  const [labPythonVersion, setLabPythonVersion] = useState(initialLabPythonVersion);
  const [venvName, setVenvName] = useState(venv);
  const [folderVenvs, setFolderVenvs] = useState(initialVenvs);
  const [dialog, setDialog] = useState<"folder" | "venv" | "venv-parent" | null>(null);
  const [createVenvDraft, setCreateVenvDraft] = useState<{ parent: string; name: string } | null>(null);
  const [browser, setBrowser] = useState<Browse | null>(null);
  const [opening, setOpening] = useState(false);
  const [changing, setChanging] = useState(false);
  const [files, setFiles] = useState(initialFiles);
  const [packages, setPackages] = useState<Library[]>(initialPackages);
  const [arrived, setArrived] = useState("");
  const [name, setName] = useState(initialName);
  const [source, setSource] = useState(initialSource);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [newName, setNewName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [installing, setInstalling] = useState(false);
  const [messageText, setMessageText] = useState("");

  const lineCount = Math.max(source.split("\n").length, 1);

  async function openFile(next: string) {
    if (next === name) return;
    if (name) {
      await fetch(`/api/lab/files/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
    }
    const res = await fetch(`/api/lab/files/${encodeURIComponent(next)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessageText(readMessage(data, "Could not open the file"));
      return;
    }
    setName(data.name);
    setSource(data.source ?? "");
    setMessageText("");
  }

  async function loadBrowse(path: string) {
    const query = path ? `?path=${encodeURIComponent(path)}` : "";
    const res = await fetch(`/api/lab/browse${query}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessageText(readMessage(data, "Could not read that folder"));
      return;
    }
    setBrowser({
      path: String(data.path ?? ""),
      parent: typeof data.parent === "string" ? data.parent : null,
      dirs: Array.isArray(data.dirs) ? data.dirs : [],
      venvs: Array.isArray(data.venvs) ? data.venvs : [],
      files: Array.isArray(data.files) ? data.files : [],
      isVenv: Boolean(data.isVenv),
    });
    setMessageText("");
  }

  function startDialog(mode: "folder" | "venv" | "venv-parent") {
    setChanging(false);
    setDialog(mode);
    const start =
      mode === "venv-parent" ? createVenvDraft?.parent || folder : folder;
    void loadBrowse(start);
  }

  function startCreateVenv() {
    setCreateVenvDraft({ parent: folder, name: ".venv" });
  }

  async function applyWorkspace(data: Record<string, unknown>, keepFile: boolean) {
    const nextFiles: string[] = Array.isArray(data.files) ? data.files.filter((item) => typeof item === "string") : [];
    const nextRoot = String(data.root ?? "");
    setFolder(nextRoot);
    setPython(String(data.python ?? ""));
    setLabPython(String(data.labPython ?? ""));
    setLabPythonVersion(String(data.labPythonVersion ?? ""));
    setVenvName(String(data.venv ?? ""));
    setFolderVenvs(Array.isArray(data.venvs) ? data.venvs.filter((item) => typeof item === "string") : []);
    setFiles(nextFiles);
    setDialog(null);
    setBrowser(null);
    setOpening(false);
    setChanging(false);
    if (!keepFile || (name && !nextFiles.includes(name))) {
      const nextName = nextFiles[0] ?? "";
      if (!nextName) {
        setName("");
        setSource("");
      } else {
        const fileRes = await fetch(`/api/lab/files/${encodeURIComponent(nextName)}`);
        const file = await fileRes.json().catch(() => ({}));
        if (fileRes.ok) {
          setName(typeof file.name === "string" ? file.name : nextName);
          setSource(typeof file.source === "string" ? file.source : "");
        }
      }
    }
    if (!data.python) {
      setPackages([]);
      return;
    }
    const listed = await fetch("/api/lab/packages");
    const body = await listed.json().catch(() => ({}));
    setPackages(listed.ok && Array.isArray(body.packages) ? body.packages : []);
    setArrived("");
  }

  async function openFolder(path: string) {
    setOpening(true);
    setMessageText("");
    const res = await fetch("/api/lab/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOpening(false);
      setMessageText(readMessage(data, "Could not open that folder"));
      return;
    }
    await applyWorkspace(data, false);
  }

  async function chooseVenv(path: string) {
    setOpening(true);
    setMessageText("");
    const res = await fetch("/api/lab/venv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOpening(false);
      setMessageText(readMessage(data, "Could not use that environment"));
      return;
    }
    await applyWorkspace(data, true);
  }

  async function confirmCreateVenv() {
    if (!createVenvDraft) return;
    const folderName = createVenvDraft.name.trim() || ".venv";
    setOpening(true);
    setMessageText("");
    const res = await fetch("/api/lab/venv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ create: true, path: createVenvDraft.parent, name: folderName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOpening(false);
      setMessageText(readMessage(data, "Could not create the environment"));
      return;
    }
    setCreateVenvDraft(null);
    await applyWorkspace(data, true);
  }

  async function createFile(event: React.FormEvent) {
    event.preventDefault();
    const fileName = newName.trim().endsWith(".py") ? newName.trim() : `${newName.trim()}.py`;
    if (fileName === ".py") return;
    const res = await fetch(`/api/lab/files/${encodeURIComponent(fileName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessageText(readMessage(data, "Could not create the file"));
      return;
    }
    setFiles((current) => (current.includes(data.name) ? current : [...current, data.name].sort()));
    setName(data.name);
    setSource("");
    setNewName("");
    setMessageText("");
  }

  async function run() {
    if (!name || running) return;
    setRunning(true);
    setLive(false);
    setOutput("");
    setResult(null);
    const res = await fetch("/api/lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, source }),
    });
    const data = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok) {
      setOutput(readMessage(data, "Could not run the program"));
      return;
    }
    const next = data as RunResult;
    setResult(next);
    setOutput(formatOutput(next));
    setLive(Boolean(next.running));
  }

  async function stop() {
    const res = await fetch("/api/lab/stop", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLive(false);
    setRunning(false);
    if (!res.ok) {
      setOutput(readMessage(data, "Could not stop the program"));
      return;
    }
    const next = data as RunResult;
    setResult(next);
    const text = formatOutput(next);
    setOutput(text ? `${text}\nStopped.` : "Stopped.");
  }

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      void fetch("/api/lab/output")
        .then((res) => res.json())
        .then((data: RunResult) => {
          const text = formatOutput(data);
          if (!data.running) {
            setLive(false);
            setResult(data);
            setOutput(text === "(no output)" ? "Stopped." : `${text}\nStopped.`);
            return;
          }
          setOutput(text);
        })
        .catch(() => undefined);
    }, 1000);
    return () => clearInterval(timer);
  }, [live]);

  async function installPackage(event: React.FormEvent) {
    event.preventDefault();
    const spec = packageName.trim();
    if (!spec || installing) return;
    const libraryName = spec.split("==")[0];
    setInstalling(true);
    setArrived("");
    setOutput("");
    setResult(null);
    setPackages((current) => [
      { name: libraryName, version: "", pending: true },
      ...current.filter((item) => item.name.toLowerCase() !== libraryName.toLowerCase()),
    ]);
    const res = await fetch("/api/lab/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: spec }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPackages((current) => current.filter((item) => !item.pending));
      setInstalling(false);
      setOutput(readMessage(data, "Could not install the package"));
      return;
    }
    const next = data as RunResult;
    setResult(next);
    setOutput(formatOutput(next));
    if (next.exitCode !== 0 || next.timedOut) {
      setPackages((current) => current.filter((item) => !item.pending));
      setInstalling(false);
      return;
    }
    const listed = await fetch("/api/lab/packages");
    const body = await listed.json().catch(() => ({}));
    if (listed.ok && Array.isArray(body.packages)) {
      setPackages(body.packages);
      setArrived(libraryName.toLowerCase());
    }
    setPackageName("");
    setInstalling(false);
  }

  function onEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void (live ? stop() : run());
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2.5">
        <h1 className="font-serif text-xl font-semibold tracking-tight">Lab</h1>
        <span className="hidden min-w-0 truncate font-mono text-sm text-muted-foreground sm:inline">
          {name || "No file"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">⌘ Enter</span>
          <button
            type="button"
            onClick={() => void (live ? stop() : run())}
            disabled={!name || running}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {running ? "Running…" : live ? "Stop" : "Run"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/institutes?stay=1")}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Back
          </button>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground">
        <p className="min-w-0 flex-1 truncate" title={folder}>
          <span className="mr-2 font-sans text-[11px] font-semibold uppercase tracking-wide text-foreground">Files</span>
          {folder}
        </p>
        <button
          type="button"
          onClick={() => startDialog("folder")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 font-sans text-xs text-foreground hover:bg-muted"
        >
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          Change folder
        </button>
      </div>

      {messageText && (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{messageText}</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex max-h-64 shrink-0 flex-col border-b border-border bg-card md:max-h-none md:w-64 md:border-b-0 md:border-r">
          <form
            onSubmit={createFile}
            className="flex items-center gap-2 border-b border-border px-2 py-2"
          >
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Files
            </span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="new.py"
              aria-label="New file name"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs"
            />
            <button
              type="submit"
              aria-label="Add file"
              className="inline-flex shrink-0 items-center rounded-lg border border-border p-1.5 hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
          <PythonFileList files={files} name={name} onOpen={openFile} />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-[2] bg-card">
            <pre
              ref={gutterRef}
              aria-hidden
              className="w-12 shrink-0 overflow-hidden border-r border-border bg-muted/50 py-4 pr-3 text-right font-mono text-sm leading-6 text-muted-foreground/80"
            >
              {Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n")}
            </pre>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              onScroll={(event) => {
                if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
              }}
              onKeyDown={onEditorKeyDown}
              spellCheck={false}
              disabled={!name || running}
              aria-label="Python program"
              className="min-h-0 w-full flex-1 resize-none bg-card py-4 pl-4 pr-4 font-mono text-sm leading-6 text-foreground outline-none disabled:opacity-60"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-shell bg-shell text-shell-foreground">
            <div className="flex shrink-0 items-center justify-between px-4 py-2 text-xs">
              <span className="font-medium tracking-wide">Output</span>
              <span className={statusClass(running || live, result)}>{statusLabel(running || live, result)}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-6 text-shell-foreground/90">
                {output || "Run a program to see output here."}
              </pre>
            </div>
          </div>
        </section>

        <aside className="flex max-h-72 shrink-0 flex-col border-t border-border bg-card md:max-h-none md:w-80 md:border-l md:border-t-0">
          {venvName ? (
            <EnvironmentPanel
              venvName={venvName}
              venvPath={resolveVenvPath(folder, venvName)}
              python={python}
              labPythonVersion={labPythonVersion}
              packages={packages}
              arrived={arrived}
              packageName={packageName}
              installing={installing}
              changing={changing}
              opening={opening}
              onPackageName={setPackageName}
              onInstall={installPackage}
              onChange={() => setChanging((current) => !current)}
              onCreate={startCreateVenv}
              onChoose={() => startDialog("venv")}
            />
          ) : (
            <EnvironmentPrompt
              venvs={folderVenvs}
              labPythonVersion={labPythonVersion}
              opening={opening}
              onUse={(item) => void chooseVenv(`${folder}/${item}`)}
              onCreate={startCreateVenv}
              onChoose={() => startDialog("venv")}
            />
          )}
        </aside>
      </div>
      {createVenvDraft && (
        <CreateVenvDialog
          parent={createVenvDraft.parent}
          name={createVenvDraft.name}
          labPythonVersion={labPythonVersion}
          opening={opening}
          onParent={(value) => setCreateVenvDraft((current) => current && { ...current, parent: value })}
          onName={(value) => setCreateVenvDraft((current) => current && { ...current, name: value })}
          onBrowse={() => startDialog("venv-parent")}
          onCancel={() => setCreateVenvDraft(null)}
          onCreate={() => void confirmCreateVenv()}
        />
      )}
      {dialog && browser && (
        <FolderDialog
          mode={dialog}
          browser={browser}
          opening={opening}
          onBrowse={(path) => void loadBrowse(path)}
          onCancel={() => {
            setDialog(null);
            setBrowser(null);
          }}
          onOpenFolder={() => void openFolder(browser.path)}
          onUseVenv={(path) => void chooseVenv(path)}
          onSelectParent={(path) => {
            setCreateVenvDraft((current) => current && { ...current, parent: path });
            setDialog(null);
            setBrowser(null);
          }}
        />
      )}
    </div>
  );
}

function PythonFileList({
  files,
  name,
  onOpen,
}: {
  files: string[];
  name: string;
  onOpen: (next: string) => void;
}) {
  return (
    <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2">
      {files.map((file) => {
        const active = file === name;
        return (
          <li key={file}>
            <button
              type="button"
              onClick={() => onOpen(file)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-sm ${
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : ""}`} />
              <span className="truncate">{file}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CreateVenvDialog({
  parent,
  name,
  labPythonVersion,
  opening,
  onParent,
  onName,
  onBrowse,
  onCancel,
  onCreate,
}: {
  parent: string;
  name: string;
  labPythonVersion: string;
  opening: boolean;
  onParent: (value: string) => void;
  onName: (value: string) => void;
  onBrowse: () => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create environment"
        className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-lg"
      >
        <h2 className="font-serif text-lg font-semibold">Create environment</h2>
        <p className="mt-1 text-sm text-muted-foreground">{labPythonCreateHint(labPythonVersion)}</p>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">Folder</label>
        <div className="mt-1 flex gap-2">
          <input
            value={parent}
            onChange={(event) => onParent(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs"
            aria-label="Parent folder for the environment"
          />
          <button
            type="button"
            onClick={onBrowse}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
          >
            Browse
          </button>
        </div>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">Environment name</label>
        <input
          value={name}
          onChange={(event) => onName(event.target.value)}
          placeholder=".venv"
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
          aria-label="Environment folder name"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            disabled={opening || !parent.trim() || !name.trim()}
            onClick={onCreate}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {opening ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnvironmentPanel({
  venvName,
  venvPath,
  python,
  labPythonVersion,
  packages,
  arrived,
  packageName,
  installing,
  changing,
  opening,
  onPackageName,
  onInstall,
  onChange,
  onCreate,
  onChoose,
}: {
  venvName: string;
  venvPath: string;
  python: string;
  labPythonVersion: string;
  packages: Library[];
  arrived: string;
  packageName: string;
  installing: boolean;
  changing: boolean;
  opening: boolean;
  onPackageName: (value: string) => void;
  onInstall: (event: React.FormEvent) => void;
  onChange: () => void;
  onCreate: () => void;
  onChoose: () => void;
}) {
  const title = venvName.split("/").filter(Boolean).pop() || venvName;
  return (
    <>
      <div className="border-b border-border px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-serif text-lg font-semibold leading-none">{title}</p>
          <button type="button" onClick={onChange} className="text-xs text-primary hover:underline">
            Change
          </button>
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
        <p className="mt-0.5 break-all font-mono text-[11px] leading-snug text-muted-foreground" title={venvPath}>
          {venvPath}
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Python</p>
        <p className="mt-0.5 break-all font-mono text-[11px] leading-snug text-muted-foreground" title={python}>
          {python}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {packages.filter((item) => !item.pending).length} libraries
        </p>
      </div>
      {changing && (
        <div className="space-y-2 border-b border-border p-2">
          <p className="px-0.5 text-[11px] text-muted-foreground">{labPythonCreateHint(labPythonVersion)}</p>
          <button
            type="button"
            disabled={opening}
            onClick={onCreate}
            className="w-full rounded-lg border border-border px-2.5 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
          >
            Create environment…
          </button>
          <button
            type="button"
            disabled={opening}
            onClick={onChoose}
            className="w-full rounded-lg border border-border px-2.5 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
          >
            Choose an existing .venv
          </button>
        </div>
      )}
      <form onSubmit={onInstall} className="flex gap-1.5 border-b border-border p-2">
        <input
          value={packageName}
          onChange={(event) => onPackageName(event.target.value)}
          placeholder="Add a library"
          aria-label="Package name"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={installing || !packageName.trim()}
          className="inline-flex items-center rounded-lg bg-primary px-2.5 text-primary-foreground disabled:opacity-50"
          aria-label="Install library"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 pb-10">
        {packages.map((item) => {
          const fresh = item.name.toLowerCase() === arrived;
          return (
            <li
              key={item.pending ? `pending-${item.name}` : item.name}
              className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ${
                item.pending
                  ? "lab-library-in bg-primary/10 text-foreground"
                  : fresh
                    ? "lab-library-in bg-muted font-medium"
                    : "hover:bg-muted/60"
              }`}
            >
              <span className="min-w-0 truncate font-mono text-sm">{item.name}</span>
              <span className={`shrink-0 font-mono text-[11px] ${item.pending ? "text-primary" : "text-muted-foreground"}`}>
                {item.pending ? "installing" : item.version}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function EnvironmentPrompt({
  venvs,
  labPythonVersion,
  opening,
  onUse,
  onCreate,
  onChoose,
}: {
  venvs: string[];
  labPythonVersion: string;
  opening: boolean;
  onUse: (name: string) => void;
  onCreate: () => void;
  onChoose: () => void;
}) {
  return (
    <div className="space-y-3 p-3">
      <p className="font-serif text-lg font-semibold leading-none">Environment</p>
      <p className="text-sm text-muted-foreground">
        {venvs.length
          ? "This folder has an environment, but not .venv. Use one of these, create .venv, or choose one from another folder."
          : "This folder has no Python environment. Create one here, or choose an environment that already exists somewhere else."}
      </p>
      <p className="text-xs text-muted-foreground">{labPythonCreateHint(labPythonVersion)}</p>
      {venvs.map((item) => (
        <button
          key={item}
          type="button"
          disabled={opening}
          onClick={() => onUse(item)}
          className="flex w-full items-center justify-between rounded-lg border border-border px-2.5 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
        >
          <span className="font-mono">{item}</span>
          <span className="text-xs text-muted-foreground">Use</span>
        </button>
      ))}
      <button
        type="button"
        disabled={opening}
        onClick={onCreate}
        className="w-full rounded-lg bg-primary px-2.5 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {opening ? "Working…" : "Create environment…"}
      </button>
      <button
        type="button"
        disabled={opening}
        onClick={onChoose}
        className="w-full rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-muted disabled:opacity-50"
      >
        Choose an existing .venv
      </button>
    </div>
  );
}

function FolderDialog({
  mode,
  browser,
  opening,
  onBrowse,
  onCancel,
  onOpenFolder,
  onUseVenv,
  onSelectParent,
}: {
  mode: "folder" | "venv" | "venv-parent";
  browser: Browse;
  opening: boolean;
  onBrowse: (path: string) => void;
  onCancel: () => void;
  onOpenFolder: () => void;
  onUseVenv: (path: string) => void;
  onSelectParent: (path: string) => void;
}) {
  const fileCount = browser.files.length;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "folder"
            ? "Change folder"
            : mode === "venv-parent"
              ? "Choose folder for environment"
              : "Choose environment"
        }
        className="flex max-h-[70vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-lg font-semibold">
            {mode === "folder"
              ? "Change folder"
              : mode === "venv-parent"
                ? "Where to create the environment"
                : "Choose environment"}
          </h2>
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
        <p className="break-all px-4 py-2 font-mono text-[11px] leading-snug text-muted-foreground" title={browser.path}>
          {browser.path}
        </p>
        {browser.isVenv ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">This folder is a Python environment.</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {browser.parent && (
              <li>
                <button
                  type="button"
                  onClick={() => onBrowse(browser.parent || "")}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  ..
                </button>
              </li>
            )}
            {browser.dirs.map((dir) => (
              <li key={dir}>
                <button
                  type="button"
                  onClick={() => onBrowse(`${browser.path}/${dir}`)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{dir}</span>
                </button>
              </li>
            ))}
            {browser.venvs.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() =>
                    mode === "venv"
                      ? onUseVenv(`${browser.path}/${item}`)
                      : onBrowse(`${browser.path}/${item}`)
                  }
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate font-mono">{item}</span>
                  </span>
                  {mode === "venv" && <span className="shrink-0 text-xs text-primary">Use</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 border-t border-border p-3">
          {mode === "folder" && (
            <>
              <p className="px-1 text-[11px] text-muted-foreground">
                {fileCount === 0 ? "No Python files" : `${fileCount} Python file${fileCount === 1 ? "" : "s"}`}
                {browser.venvs.length > 0 ? ` · ${browser.venvs.join(", ")}` : ""}
              </p>
              {fileCount > 0 && (
                <p className="truncate px-1 font-mono text-[11px] text-muted-foreground" title={browser.files.join(", ")}>
                  {browser.files.slice(0, 3).join(", ")}
                </p>
              )}
              <button
                type="button"
                disabled={opening}
                onClick={onOpenFolder}
                className="w-full rounded-lg bg-primary px-2.5 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {opening ? "Opening…" : "Open folder"}
              </button>
            </>
          )}
          {mode === "venv-parent" && (
            <button
              type="button"
              disabled={opening || browser.isVenv}
              onClick={() => onSelectParent(browser.path)}
              className="w-full rounded-lg bg-primary px-2.5 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              Use this folder
            </button>
          )}
          {mode === "venv" && (
            <button
              type="button"
              disabled={opening || !browser.isVenv}
              onClick={() => onUseVenv(browser.path)}
              className="w-full rounded-lg bg-primary px-2.5 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            >
              {opening ? "Opening…" : "Use this environment"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function statusLabel(running: boolean, result: RunResult | null) {
  if (running) return "Running";
  if (!result) return "Ready";
  if (result.timedOut) return "Stopped";
  if (result.exitCode) return `Exit ${result.exitCode}`;
  return "Finished";
}

function statusClass(running: boolean, result: RunResult | null) {
  if (result?.timedOut || result?.exitCode) return "text-red-300";
  if (result && !running) return "text-emerald-300";
  return "text-shell-foreground/70";
}

function resolveVenvPath(projectFolder: string, venv: string) {
  if (!venv) return "";
  if (venv.startsWith("/")) return venv;
  const base = projectFolder.replace(/\/$/, "");
  return `${base}/${venv}`;
}

function labPythonCreateHint(version: string) {
  if (version) return `Create .venv uses Lab Python ${version} on this server.`;
  return "Create .venv uses the shared Lab Python on this server.";
}

function readMessage(data: { detail?: unknown; error?: unknown }, fallback: string) {
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.error === "string") return data.error;
  return fallback;
}

function formatOutput(result: RunResult) {
  const parts: string[] = [];
  if (result.stdout) parts.push(result.stdout.replace(/\s+$/, ""));
  if (result.stderr) parts.push(result.stderr.replace(/\s+$/, ""));
  if (result.timedOut) parts.push("Program stopped: time limit (5 seconds).");
  return parts.join("\n") || "(no output)";
}
