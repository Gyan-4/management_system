"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2, LockKeyhole, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [setup, setSetup] = useState(false);
  const [nextPath, setNextPath] = useState("/");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/")) setNextPath(next);

    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => setSetup(!!d.setupRequired))
      .catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = setup ? "/api/auth/setup" : "/api/auth/login";
    const body = setup ? { name, email, password } : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <div className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-7 py-7">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 text-white">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                Project Control
              </div>
              <h1 className="text-xl font-bold">ConstructFlow</h1>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            {setup
              ? "Create the first administrator account for this system."
              : "Sign in to access your construction management workspace."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 p-7">
          {error && (
            <div className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {setup && (
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              placeholder="Project manager name"
            />
          )}

          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="name@company.com"
            type="email"
          />

          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            type="password"
          />

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Please wait...
              </>
            ) : setup ? (
              <>
                <UserPlus size={16} />
                Create Administrator
              </>
            ) : (
              <>
                <LockKeyhole size={16} />
                Sign In
              </>
            )}
          </button>

          {setup && (
            <p className="text-xs text-slate-500">
              This one-time setup creates an Admin account. Afterward, the
              normal login screen is used.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}
