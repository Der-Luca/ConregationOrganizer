import { useEffect, useState, useCallback } from "react";
import api from "../../api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("male");
  const [roles, setRoles] = useState(["publisher"]);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [usernameSuggestion, setUsernameSuggestion] = useState(null);
  const [error, setError] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [editingRolesId, setEditingRolesId] = useState(null);
  const [editingRoles, setEditingRoles] = useState([]);
  const [editingGenderId, setEditingGenderId] = useState(null);
  const [editingGender, setEditingGender] = useState("");

  const ROLE_LABELS = {
    admin: "Administrador",
    cartplanner: "Planificador de P-Poc",
    fieldserviceplanner: "Planificador de servicio",
    talk_assistant: "Asistente de discurso",
    publisher: "Publicador",
  };

  function roleLabel(role) {
    return ROLE_LABELS[role] || role;
  }

  async function loadUsers() {
    const res = await api.get("/users");
    setUsers(res.data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-generate username from firstname unless user edited it manually
  useEffect(() => {
    if (usernameTouched) return;

    if (!firstname) {
      setUsername("");
      return;
    }

    const slug = firstname
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setUsername(slug);
  }, [firstname, usernameTouched]);

  // Check username availability with debounce
  const checkUsername = useCallback(async (value) => {
    if (!value || value.length < 2) {
      setUsernameStatus(null);
      setUsernameSuggestion(null);
      return;
    }

    setUsernameStatus("checking");
    try {
      const res = await api.get(`/users/check-username/${encodeURIComponent(value)}`);
      setUsernameStatus(res.data.available ? "available" : "taken");
      setUsernameSuggestion(res.data.suggestion);
    } catch {
      setUsernameStatus(null);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsername(username);
    }, 300);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/users", {
        firstname,
        lastname,
        email: email || undefined,
        username: username || undefined,
        gender: gender || undefined,
        roles,
      });

      // Copy invite URL to clipboard
      const fullUrl = window.location.origin + res.data.invite_url;
      await navigator.clipboard.writeText(fullUrl);

      // Reset form
      setFirstname("");
      setLastname("");
      setEmail("");
      setUsername("");
      setUsernameTouched(false);
      setGender("male");
      setRoles(["publisher"]);
      setUsernameStatus(null);
      setUsernameSuggestion(null);

      // Reload users and show success
      loadUsers();
      alert(`User created! Invite link copied to clipboard:\n${fullUrl}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to create user";
      setError(typeof msg === "string" ? msg : "Failed to create user");
    }
  }

  async function saveRoles(userId) {
    try {
      await api.patch(`/users/${userId}/roles`, { roles: editingRoles });
      setEditingRolesId(null);
      loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to update roles";
      alert(typeof msg === "string" ? msg : "Failed to update roles");
    }
  }

  async function saveGender(userId) {
    try {
      await api.patch(`/users/${userId}/gender?gender=${editingGender || ""}`);
      setEditingGenderId(null);
      loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to update gender";
      alert(typeof msg === "string" ? msg : "Failed to update gender");
    }
  }

  async function copyInviteLink(userId) {
    try {
      const res = await api.get(`/users/${userId}/invite`);
      const fullUrl = window.location.origin + res.data.invite_url;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to generate invite link";
      alert(typeof msg === "string" ? msg : "Failed to generate invite link");
    }
  }

  async function resetPassword(userId, userName) {
    if (!confirm(`Reset password for ${userName}? This will generate a new invite link.`)) {
      return;
    }
    try {
      const res = await api.post(`/users/${userId}/reset-password`);
      const fullUrl = window.location.origin + res.data.invite_url;
      await navigator.clipboard.writeText(fullUrl);
      loadUsers();
      alert(`Password reset! New invite link copied to clipboard:\n${fullUrl}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to reset password";
      alert(typeof msg === "string" ? msg : "Failed to reset password");
    }
  }

  async function toggleActive(userId, currentActive) {
    try {
      await api.patch(`/users/${userId}?active=${!currentActive}`);
      loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to update user";
      alert(typeof msg === "string" ? msg : "Failed to update user");
    }
  }

  async function deleteUser(userId, userName) {
    if (!confirm(`Delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/users/${userId}`);
      loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to delete user";
      alert(typeof msg === "string" ? msg : "Failed to delete user");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin – Users</h1>
        <p className="text-sm text-gray-500">Create, manage, and invite users.</p>
      </div>

      <form onSubmit={handleCreate} className="border border-gray-200 rounded-2xl p-6 space-y-4 bg-white shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Create New User</div>

        {error && (
          <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            placeholder="Firstname"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            required
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            placeholder="Lastname"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            required
          />
        </div>

        <input
          type="email"
          className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            className={`border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 ${
              usernameStatus === "taken" ? "border-red-300" : "border-gray-300"
            } ${usernameStatus === "available" ? "border-green-300" : ""}`}
            placeholder="Username (auto-generated)"
            value={username}
            onChange={(e) => {
              const value = e.target.value;
              setUsername(value);
              setUsernameTouched(value.length > 0);
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
            {usernameStatus === "checking" && (
              <span className="text-gray-400">...</span>
            )}
            {usernameStatus === "available" && (
              <span className="text-green-600 text-xs font-medium">Available</span>
            )}
            {usernameStatus === "taken" && (
              <span className="text-red-600 text-xs font-medium">Taken</span>
            )}
          </div>
        </div>

        {usernameStatus === "taken" && usernameSuggestion && (
          <button
            type="button"
            onClick={() => setUsername(usernameSuggestion)}
            className="text-sm text-blue-600 hover:underline"
          >
            Use suggestion: {usernameSuggestion}
          </button>
        )}

        <div>
          <div className="text-sm font-medium text-gray-700 mb-1">Género</div>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-700">Roles</div>
          <div className="flex flex-wrap gap-3">
            {["publisher", "cartplanner", "fieldserviceplanner", "talk_assistant", "admin"].map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRoles([...roles, r]);
                    } else {
                      setRoles(roles.filter((x) => x !== r));
                    }
                  }}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
                />
                {roleLabel(r)}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={usernameStatus === "taken"}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50"
        >
          Create User & Copy Invite Link
        </button>
      </form>

      <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">Users</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Género</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-4 text-gray-900">
                    {user.firstname} {user.lastname}
                  </td>
                  <td className="p-4 font-mono text-gray-500">{user.username}</td>
                  <td className="p-4 text-gray-500">{user.email || "-"}</td>
                  <td className="p-4">
                    {user.username === "congregation-admin" ? (
                      <span className="text-xs text-gray-400">{user.gender || "-"}</span>
                    ) : editingGenderId === user.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                          value={editingGender}
                          onChange={(e) => setEditingGender(e.target.value)}
                        >
                          <option value="male">M</option>
                          <option value="female">F</option>
                        </select>
                        <button
                          onClick={() => saveGender(user.id)}
                          className="text-xs text-green-700 hover:underline"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingGenderId(null)}
                          className="text-xs text-gray-400 hover:underline"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingGenderId(user.id);
                          setEditingGender(user.gender || "");
                        }}
                        className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {user.gender === "male" ? "M" : user.gender === "female" ? "F" : "-"}
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles || []).map((r) => (
                        <span
                          key={r}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            r === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : r === "cartplanner"
                              ? "bg-blue-100 text-blue-700"
                              : r === "fieldserviceplanner"
                              ? "bg-teal-100 text-teal-700"
                              : r === "talk_assistant"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {roleLabel(r)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    {!user.active ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Inactive
                      </span>
                    ) : user.has_password ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Registered
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {user.username === "congregation-admin" ? (
                      <span className="text-xs text-gray-400">Protected</span>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {!user.has_password ? (
                            <button
                              onClick={() => copyInviteLink(user.id)}
                              className="text-sm text-gray-700 hover:text-gray-900 hover:underline"
                            >
                              {copiedId === user.id ? "Copied!" : "Copy Link"}
                            </button>
                          ) : (
                            <button
                              onClick={() => resetPassword(user.id, user.firstname)}
                              className="text-sm text-gray-700 hover:text-gray-900 hover:underline"
                            >
                              Reset Password
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingRolesId(editingRolesId === user.id ? null : user.id);
                              setEditingRoles(user.roles || []);
                            }}
                            className="text-sm text-gray-700 hover:text-gray-900 hover:underline"
                          >
                            Roles
                          </button>
                          <button
                            onClick={() => toggleActive(user.id, user.active)}
                            className="text-sm text-gray-700 hover:text-gray-900 hover:underline"
                          >
                            {user.active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.username)}
                            className="text-sm text-red-600 hover:text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                        {editingRolesId === user.id && (
                          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {["publisher", "cartplanner", "fieldserviceplanner", "talk_assistant", "admin"].map((r) => (
                                <label key={r} className="flex items-center gap-2 text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={editingRoles.includes(r)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditingRoles([...editingRoles, r]);
                                      } else {
                                        setEditingRoles(editingRoles.filter((x) => x !== r));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
                                  />
                                  {roleLabel(r)}
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveRoles(user.id)}
                                disabled={editingRoles.length === 0}
                                className="bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-black disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRolesId(null)}
                                className="text-xs text-gray-600 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No users yet</div>
        )}
      </div>
    </div>
  );
}
