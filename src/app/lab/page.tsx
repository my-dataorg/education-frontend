import { auth } from "@/auth";
import { EduNavGate } from "@/components/edu-nav-gate";
import { PythonLab } from "@/components/python-lab";
import { redirect } from "next/navigation";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export default async function LabPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const workspace = await loadWorkspace(session.accessToken);

  return (
    <div className="lab-screen flex h-dvh flex-col overflow-hidden bg-background">
      <EduNavGate />
      <main className="min-h-0 flex-1 overflow-hidden">
        {workspace.error ? (
          <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {workspace.error}
          </p>
        ) : (
          <PythonLab
            root={workspace.root}
            pythonPath={workspace.pythonPath}
            labPython={workspace.labPython}
            labPythonVersion={workspace.labPythonVersion}
            venv={workspace.venv}
            venvs={workspace.venvs}
            files={workspace.files}
            packages={workspace.packages}
            initialName={workspace.name}
            initialSource={workspace.source}
          />
        )}
      </main>
    </div>
  );
}

async function loadWorkspace(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const [res, packageRes] = await Promise.all([
    fetch(`${API}/v1/lab`, { headers, cache: "no-store" }),
    fetch(`${API}/v1/lab/packages`, { headers, cache: "no-store" }),
  ]);
  const data = await res.json().catch(() => ({}));
  const packageData = await packageRes.json().catch(() => ({}));
  const packages = Array.isArray(packageData.packages) ? packageData.packages : [];
  if (!res.ok) {
    return {
      error: typeof data.detail === "string" ? data.detail : "Could not open Lab",
      root: "",
      pythonPath: "",
      labPython: "",
      labPythonVersion: "",
      venv: "",
      venvs: [] as string[],
      files: [] as string[],
      packages,
      name: "",
      source: "",
    };
  }
  const files: string[] = Array.isArray(data.files) ? data.files : [];
  const name = files[0] ?? "";
  let source = "";
  if (name) {
    const fileRes = await fetch(`${API}/v1/lab/files/${encodeURIComponent(name)}`, {
      headers,
      cache: "no-store",
    });
    const file = await fileRes.json().catch(() => ({}));
    if (fileRes.ok && typeof file.source === "string") source = file.source;
  }
  return {
    error: "",
    root: String(data.root ?? ""),
    pythonPath: String(data.python ?? ""),
    labPython: String(data.labPython ?? ""),
    labPythonVersion: String(data.labPythonVersion ?? ""),
    venv: String(data.venv ?? ""),
    venvs: Array.isArray(data.venvs) ? data.venvs.filter((item: unknown) => typeof item === "string") : [],
    files,
    packages,
    name,
    source,
  };
}
