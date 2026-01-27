import { useEffect, useState, useCallback } from "react";
import api from "../../api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [usernameSuggestion, setUsernameSuggestion] = useState(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  async function loadUsers() {
    const res = await api.get("/users");
    setUsers(res.data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-generate username from firstname
  useEffect(() => {
    if (firstname && !username) {
      const slug = firstname
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setUsername(slug);
    }
  }, [firstname]);

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
        role,
      });

      // Copy invite URL to clipboard
      const fullUrl = window.location.origin + res.data.invite_url;
      await navigator.clipboard.writeText(fullUrl);

      // Reset form
      setFirstname("");
      setLastname("");
      setEmail("");
      setUsername("");
      setRole("user");
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
      <h1 className="text-xl font-semibold">Admin – Users</h1>

      <form onSubmit={handleCreate} className="border rounded-xl p-4 space-y-3 bg-white">
        <div className="text-sm font-medium text-black/60 mb-2">Create New User</div>

        {error && (
          <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Firstname"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Lastname"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            required
          />
        </div>

        <input
          type="email"
          className="border rounded px-3 py-2 w-full"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            className={`border rounded px-3 py-2 w-full ${
              usernameStatus === "taken" ? "border-red-300" : ""
            } ${usernameStatus === "available" ? "border-green-300" : ""}`}
            placeholder="Username (auto-generated)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
            {usernameStatus === "checking" && (
              <span className="text-black/40">...</span>
            )}
            {usernameStatus === "available" && (
              <span className="text-green-600">Available</span>
            )}
            {usernameStatus === "taken" && (
              <span className="text-red-600">Taken</span>
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

        <select
          className="border rounded px-3 py-2 w-full"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button
          type="submit"
          disabled={usernameStatus === "taken"}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Create User & Copy Invite Link
        </button>
      </form>

      <div className="border rounded-xl bg-white">
        <div className="border-b p-3 font-medium">Users</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Username</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-3">
                    {user.firstname} {user.lastname}
                  </td>
                  <td className="p-3 font-mono text-black/60">{user.username}</td>
                  <td className="p-3 text-black/60">{user.email || "-"}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    {!user.active ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                        Inactive
                      </span>
                    ) : user.has_password ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                        Registered
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {user.username === "congregation-admin" ? (
                      <span className="text-xs text-black/40">Protected</span>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {!user.has_password ? (
                          <button
                            onClick={() => copyInviteLink(user.id)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {copiedId === user.id ? "Copied!" : "Copy Link"}
                          </button>
                        ) : (
                          <button
                            onClick={() => resetPassword(user.id, user.firstname)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Reset Password
                          </button>
                        )}
                        <button
                          onClick={() => toggleActive(user.id, user.active)}
                          className="text-orange-600 hover:underline text-sm"
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.username)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="p-3 text-sm text-black/60">No users yet</div>
        )}
      </div>
    </div>
  );
}
