import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  ShieldCheck,
  Mail,
  User,
  Phone,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { useThemeStore } from "../../store/theme";
import { api } from "../../api/client";
import {
  getApiErrorMessage,
  requestWithFallback,
  shouldFallbackRoute,
} from "../../api/helpers";
import { useAuth } from "../components/AuthContext";
import { useTranslation } from "../../context/TranslationContext";
import Toast from "../../components/Toast";

export default function UsersPage() {
  const { theme } = useThemeStore();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const pageBg = isDark ? "bg-[#3e2723]" : "bg-[#f5f1e8]";
  const text = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const card = isDark ? "bg-[#3e2723]" : "bg-white";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const subtle = isDark ? "bg-white/5" : "bg-black/[0.03]";
  const inputBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const inputText = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";

  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    roleId: 2,
  });
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    roleId: 2,
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "success" });

  const notify = useCallback((message, tone = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => {
      setToast({ message: "", tone: "success" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.message]);

  const loadUsers = useCallback(
    async ({ notify: notifyToast = false } = {}) => {
      setLoading(true);
      setError("");
      try {
        const { data } = await requestWithFallback(
          [() => api.get("/admin/users")],
          (err) => shouldFallbackRoute(err) || err?.response?.status === 500
        );
        setUsers(Array.isArray(data) ? data : []);
        if (notifyToast) {
          notify(t("users_loaded", "Users loaded."));
        }
      } catch (err) {
        setUsers([]);
        const message = getApiErrorMessage(err, "Failed to load users");
        setError(message);
        notify(message, "error");
      } finally {
        setLoading(false);
      }
    },
    [notify, t]
  );

  useEffect(() => {
    void loadUsers({ notify: true });
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        String(u.fullName || "").toLowerCase().includes(query) ||
        String(u.email || "").toLowerCase().includes(query) ||
        String(u.phone || "").toLowerCase().includes(query)
    );
  }, [users, q]);

  const loadRoles = useCallback(async () => {
    const { data } = await api.get("/admin/roles");
    return Array.isArray(data) ? data : [];
  }, []);

  const openAdd = async () => {
    setError("");
    setSaving(false);
    setForm({ fullName: "", email: "", phone: "", roleId: roles[0]?.id || 2 });
    setShowAdd(true);
    try {
      const data = roles.length ? roles : await loadRoles();
      setRoles(data);
      if (!form.roleId && data.length) {
        setForm((prev) => ({ ...prev, roleId: data[0].id }));
      }
    } catch (err) {
      setShowAdd(false);
      const message = getApiErrorMessage(err, "Failed to load roles");
      setError(message);
      notify(message, "error");
    }
  };

  const openEdit = async (u) => {
    if (!u) return;
    setError("");
    setSaving(false);
    setEditTarget(u);
    setEditForm({
      fullName: String(u.fullName || ""),
      phone: String(u.phone || ""),
      roleId: Number(u.roleId) || 2,
      status: String(u.status || "active"),
    });
    setShowEdit(true);

    if (roles.length) return;
    try {
      const data = await loadRoles();
      setRoles(data);
    } catch (err) {
      setShowEdit(false);
      setEditTarget(null);
      const message = getApiErrorMessage(err, "Failed to load roles");
      setError(message);
      notify(message, "error");
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        roleId: Number(form.roleId) || 2,
      };
      const { data } = await api.post("/admin/users", payload);
      setUsers((prev) => [data, ...prev]);
      setShowAdd(false);
      notify(t("user_created", "User created."));
    } catch (err) {
      const message = getApiErrorMessage(err, "Create user failed");
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        roleId: Number(editForm.roleId) || 2,
        status: editForm.status,
      };
      await api.patch(`/admin/users/${editTarget.id}`, payload);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editTarget.id
            ? {
                ...u,
                fullName: payload.fullName,
                phone: payload.phone || null,
                roleId: payload.roleId,
                roleName:
                  roles.find((r) => Number(r.id) === Number(payload.roleId))
                    ?.name || u.roleName,
                status: payload.status,
              }
            : u
        )
      );
      setShowEdit(false);
      setEditTarget(null);
      notify(t("user_updated", "User updated."));
    } catch (err) {
      const message = getApiErrorMessage(err, "Update user failed");
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userToDelete) => {
    if (!userToDelete?.id) return;
    if (Number(userToDelete.id) === Number(currentUser?.id)) {
      notify(t("cannot_delete_self", "You cannot delete your own account."), "error");
      return;
    }

    const ok = window.confirm(
      t(
        "confirm_delete_user",
        `Delete ${userToDelete.fullName || userToDelete.email || "this user"}?`
      )
    );
    if (!ok) return;

    setSaving(true);
    setError("");
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      notify(t("user_deleted", "User deleted."));
    } catch (err) {
      const message = getApiErrorMessage(err, "Delete user failed");
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`p-4 min-h-screen ${pageBg} ${text} heritage-page-root`}>
      <Toast message={toast.message} tone={toast.tone} />
      <div
        className={`rounded-lg p-5 mb-6 border ${border}
        bg-gradient-to-r from-[#5d4037]/10 to-[#d4af37]/12 heritage-panel heritage-panel--accent`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">{t("users", "Users")}</h3>
            <p className="opacity-70">
              {t(
                "users_desc",
                "Registered users (name, email, phone) - passwords are never shown."
              )}
            </p>
          </div>

          <button
            className="heritage-btn inline-flex items-center gap-2 px-4 py-3 rounded-md shadow disabled:opacity-60"
            type="button"
            onClick={openAdd}
            disabled={currentUser?.role !== 1}
            title={
              currentUser?.role !== 1 ? "Admin only" : "Add a new user"
            }
          >
            <UserPlus className="w-5 h-5" />
            {t("add_user", "Add User")}
          </button>
        </div>

        <div className="mt-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`heritage-input w-full pl-9 pr-3 py-2 rounded-md border
            focus:outline-none focus:ring-2 focus:ring-[#5d4037]/25
            ${inputBg} ${inputText} ${border}`}
            placeholder={t("search_users", "Search users...")}
          />
        </div>
      </div>

      <div className={`rounded-lg border ${border} ${card} overflow-hidden heritage-panel`}>
        {loading ? (
          <div className="p-10 text-center opacity-60">
            {t("loading", "Loading...")}
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <div className="text-[#a0552a] font-semibold">{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center opacity-60">
            {t("no_results", "No results.")}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="heritage-table w-full text-sm">
              <thead className={subtle}>
                <tr className={`text-start border-b ${border}`}>
                  <th className="py-3 px-4 text-start">{t("full_name", "Full Name")}</th>
                  <th className="py-3 px-4 text-start">{t("email", "Email")}</th>
                  <th className="py-3 px-4 text-start">{t("phone", "Phone")}</th>
                  <th className="py-3 px-4 text-start">{t("role", "Role")}</th>
                  <th className="py-3 px-4 text-start">{t("status", "Status")}</th>
                  {currentUser?.role === 1 ? (
                    <th className="py-3 px-4 text-end">{t("actions", "Actions")}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b ${border} ${
                      u.id === currentUser?.id ? "bg-[#5d4037]/10" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-start">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 opacity-70" />
                        <span className="font-medium">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-start">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 opacity-70" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-start">{u.phone || "-"}</td>
                      <td className="py-3 px-4 text-start">
                        <span className="heritage-pill heritage-pill--tag">
                          <ShieldCheck className="w-3 h-3" />
                          {u.roleName || u.roleId}
                        </span>
                      </td>
                    <td className="py-3 px-4 text-start">{u.status}</td>
                    {currentUser?.role === 1 ? (
                      <td className="py-3 px-4 text-end">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                            onClick={() => openEdit(u)}
                            disabled={saving}
                          >
                            <Pencil className="w-4 h-4" />
                            {t("edit", "Edit")}
                          </button>
                          <button
                            type="button"
                            className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#a0552a] text-white hover:bg-[#a0552a] disabled:opacity-60"
                            onClick={() => deleteUser(u)}
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t("delete", "Delete")}
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => (saving ? null : setShowAdd(false))}
          />
          <div
            className={`relative w-full max-w-lg rounded-lg border ${border} ${card} p-6 shadow-xl heritage-panel`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xl font-bold">{t("add_user", "Add User")}</h4>
                <p className="text-sm opacity-70">
                  {t(
                    "add_user_desc",
                    "We will email them a password-reset code to set their password."
                  )}
                </p>
              </div>
              <button
                type="button"
                className={`p-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                onClick={() => setShowAdd(false)}
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submitAdd}>
              <label className="block">
                <span className="text-sm font-semibold">{t("full_name", "Full Name")}</span>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, fullName: e.target.value }))
                  }
                  required
                  className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                  placeholder={t("full_name_placeholder", "Full name")}
                  disabled={saving}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">{t("email", "Email")}</span>
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, email: e.target.value }))
                  }
                  required
                  type="email"
                  className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                  placeholder="email@example.com"
                  disabled={saving}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">{t("phone", "Phone")}</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, phone: e.target.value }))
                  }
                  className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                  placeholder="+1 555 123 4567"
                  disabled={saving}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">{t("role", "Role")}</span>
                <select
                  value={form.roleId}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, roleId: e.target.value }))
                  }
                  className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                  disabled={saving}
                >
                  {(roles.length ? roles : [{ id: 2, name: "user" }]).map(
                    (r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              {error ? (
                <div className="text-sm text-[#556b2f] font-semibold">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className={`heritage-btn heritage-btn--ghost px-4 py-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                >
                  {t("cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="heritage-btn px-4 py-2 rounded-md disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? t("creating", "Creating...") : t("create_user", "Create User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEdit ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => (saving ? null : setShowEdit(false))}
          />
          <div
            className={`relative w-full max-w-lg rounded-lg border ${border} ${card} p-6 shadow-xl heritage-panel`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xl font-bold">{t("edit_user", "Edit User")}</h4>
                <p className="text-sm opacity-70">
                  {editTarget?.email || ""}
                </p>
              </div>
              <button
                type="button"
                className={`p-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                onClick={() => setShowEdit(false)}
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submitEdit}>
              <label className="block">
                <span className="text-sm font-semibold">{t("full_name", "Full Name")}</span>
                <input
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, fullName: e.target.value }))
                  }
                  required
                  className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                  disabled={saving}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">{t("phone", "Phone")}</span>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, phone: e.target.value }))
                  }
                  className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                  disabled={saving}
                />
              </label>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-semibold">{t("role", "Role")}</span>
                   <select
                     value={editForm.roleId}
                     onChange={(e) =>
                       setEditForm((s) => ({ ...s, roleId: e.target.value }))
                     }
                     className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                     disabled={saving}
                   >
                    {(roles.length ? roles : [{ id: 2, name: "user" }]).map(
                      (r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold">{t("status", "Status")}</span>
                   <select
                     value={editForm.status}
                     onChange={(e) =>
                       setEditForm((s) => ({ ...s, status: e.target.value }))
                     }
                     className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                     disabled={saving}
                   >
                    <option value="active">{t("active", "Active")}</option>
                    <option value="disabled">{t("disabled", "Disabled")}</option>
                  </select>
                </label>
              </div>

              {error ? (
                <div className="text-sm text-[#556b2f] font-semibold">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className={`heritage-btn heritage-btn--ghost px-4 py-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                  onClick={() => setShowEdit(false)}
                  disabled={saving}
                >
                  {t("cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="heritage-btn px-4 py-2 rounded-md disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? t("saving", "Saving...") : t("save", "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}





