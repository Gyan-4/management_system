"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Database,
  Loader2,
  Pencil,
  RefreshCw,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";

type CompanySettings = {
  name: string;
  address: string;
  engineer: string;
  contact: string;
};

type DatabaseStatus = {
  ok: boolean;
  database: string;
  state: string;
  collections?: string[];
  checkedAt?: string;
  error?: string;
};

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Project Manager" | "Engineer";
  active: boolean;
  createdAt?: string;
};

const emptySettings: CompanySettings = {
  name: "",
  address: "",
  engineer: "",
  contact: "",
};

const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "Project Manager" as UserRecord["role"],
  active: true,
};

export default function SettingsPage() {
  const router = useRouter();
  const [company, setCompany] = useState<CompanySettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState(emptyUser);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();
        if (data.user?.role !== "Admin") {
          router.replace("/");
          return false;
        }
        setAuthorized(true);
        return true;
      } catch {
        router.replace("/");
        return false;
      }
    }

    async function load() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load settings.");
        const data = await response.json();
        setCompany({
          name: data.name || "",
          address: data.address || "",
          engineer: data.engineer || "",
          contact: data.contact || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load settings.");
      } finally {
        setLoading(false);
      }
    }

    void (async () => {
      if (await checkAccess()) {
        await load();
        await checkDatabase();
        await loadUsers();
      }
    })();
  }, []);

  async function checkDatabase() {
    setCheckingDb(true);
    try {
      const response = await fetch("/api/settings/database", { cache: "no-store" });
      const data = await response.json();
      setDbStatus(data);
    } catch {
      setDbStatus({
        ok: false,
        database: "construction_management",
        state: "error",
        error: "Could not check database connection.",
      });
    } finally {
      setCheckingDb(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    setUserError("");
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403) {
        setUserError("Only administrators can manage user accounts.");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not load users.");
      setUsers(data.users || []);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      if (!response.ok) throw new Error("Could not save settings.");
      const data = await response.json();
      setCompany({
        name: data.name || "",
        address: data.address || "",
        engineer: data.engineer || "",
        contact: data.contact || "",
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  function startAddUser() {
    setEditingUserId(null);
    setUserForm({ ...emptyUser });
    setUserError("");
    setUserSuccess("");
    setUserFormOpen(true);
  }

  function startEditUser(user: UserRecord) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
    });
    setUserError("");
    setUserSuccess("");
    setUserFormOpen(true);
  }

  async function saveUser() {
    setUserSaving(true);
    setUserError("");
    setUserSuccess("");

    try {
      const payload = editingUserId
        ? { id: editingUserId, ...userForm }
        : userForm;

      const response = await fetch("/api/users", {
        method: editingUserId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save user.");
      }

      setUserSuccess(editingUserId ? "User account updated." : "User account created.");
      setUserFormOpen(false);
      await loadUsers();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Could not save user.");
    } finally {
      setUserSaving(false);
    }
  }

  if (authorized !== true) {
    return (
      <main className="min-h-screen p-5 md:p-8">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center text-sm text-slate-500">
          Checking administrator access...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 border-b border-slate-200 pb-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            System / Configuration
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure firm information, user access, and system connectivity.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
            <div className="border border-slate-200 bg-slate-50 p-2">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Company Information</h2>
              <p className="mt-1 text-xs text-slate-500">
                Stored in MongoDB so the settings persist across browsers and devices.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading settings...
            </div>
          ) : (
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field
                label="Company / Firm Name"
                value={company.name}
                onChange={(v) => setCompany({ ...company, name: v })}
              />
              <Field
                label="Project Engineer"
                value={company.engineer}
                onChange={(v) => setCompany({ ...company, engineer: v })}
              />
              <Field
                label="Office Address"
                value={company.address}
                onChange={(v) => setCompany({ ...company, address: v })}
              />
              <Field
                label="Contact Information"
                value={company.contact}
                onChange={(v) => setCompany({ ...company, contact: v })}
              />
            </div>
          )}

          <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              onClick={save}
              disabled={loading || saving}
              className="flex items-center gap-2 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check size={16} />
                  Saved
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </section>

        <section className="mt-5 border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <Users size={19} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-bold">User Accounts</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Create separate accounts for administrators, project managers, and engineers.
              </p>
            </div>
            <button
              onClick={startAddUser}
              className="ml-auto flex items-center gap-2 bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              <UserPlus size={14} />
              Add User
            </button>
          </div>

          {userSuccess && (
            <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800">
              {userSuccess}
            </div>
          )}

          {userError && (
            <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
              {userError}
            </div>
          )}

          {userFormOpen && (
            <div className="border-b border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">
                    {editingUserId ? "Edit User Account" : "Add User Account"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Email addresses must be unique. Passwords are stored as secure hashes.
                  </p>
                </div>
                <button
                  onClick={() => setUserFormOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Full Name"
                  value={userForm.name}
                  onChange={(v) => setUserForm({ ...userForm, name: v })}
                />
                <Field
                  label="Email"
                  value={userForm.email}
                  onChange={(v) => setUserForm({ ...userForm, email: v })}
                  type="email"
                />
                <Field
                  label={editingUserId ? "New Password (optional)" : "Password"}
                  value={userForm.password}
                  onChange={(v) => setUserForm({ ...userForm, password: v })}
                  type="password"
                />
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Role</span>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        role: e.target.value as UserRecord["role"],
                      })
                    }
                    className="mt-1.5 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option>Project Manager</option>
                    <option>Engineer</option>
                    <option>Admin</option>
                  </select>
                </label>

                {editingUserId && (
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={userForm.active}
                      onChange={(e) =>
                        setUserForm({ ...userForm, active: e.target.checked })
                      }
                    />
                    Active account
                  </label>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={saveUser}
                  disabled={userSaving}
                  className="flex items-center gap-2 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {userSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingUserId ? "Update User" : "Create User"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {usersLoading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading user accounts...
            </div>
          ) : users.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            user.active
                              ? "border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800"
                              : "border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500"
                          }
                        >
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => startEditUser(user)}
                          className="inline-flex items-center gap-1.5 border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !userError ? (
            <div className="p-8 text-sm text-slate-500">No user accounts found.</div>
          ) : null}
        </section>

        <section className="mt-5 border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <Database size={19} className="text-blue-600" />
              <div>
                <h2 className="text-sm font-bold">Database Connection</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Production records are stored in MongoDB through the server API. The connection string stays server-side.
                </p>
              </div>
              <button
                onClick={checkDatabase}
                disabled={checkingDb}
                className="ml-auto flex items-center gap-2 border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-50"
              >
                <RefreshCw size={14} className={checkingDb ? "animate-spin" : ""} />
                Check
              </button>
            </div>
          </div>

          <div className="p-6">
            {!dbStatus ? (
              <div className="text-sm text-slate-500">Checking MongoDB...</div>
            ) : dbStatus.ok ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    Connected
                  </span>
                  <span className="text-sm font-bold text-slate-900">{dbStatus.database}</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Database</div>
                    <div className="mt-1 font-bold">{dbStatus.database}</div>
                  </div>
                  <div className="border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Collections</div>
                    <div className="mt-1 font-bold">{dbStatus.collections?.length || 0}</div>
                  </div>
                </div>
                {dbStatus.collections?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dbStatus.collections.map((name) => (
                      <span key={name} className="border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                    The database is connected, but no collections exist yet. Creating the first project or saving settings will create application data.
                  </div>
                )}
              </>
            ) : (
              <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="font-bold">Database check failed</div>
                <div className="mt-1">{dbStatus.error || "MongoDB is not reachable."}</div>
              </div>
            )}
          </div>
        </section>
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
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        required={type !== "password" || !placeholder?.includes("optional")}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}
