"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  LockIcon, LockOpenIcon, KeyIcon, TrashIcon, ChevronUpIcon,
  UserIcon, CheckIcon, XIcon, HistoryIcon, BanIcon, EyeIcon, EyeOffIcon,
  CheckSquare2Icon, SquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "pending";
  lockedAt: string | null;
  createdAt: string;
  lastIp: string | null;
  lastLoginAt: string | null;
};

type LoginLog = {
  id: string;
  userId: string;
  ipAddress: string;
  loginAt: string;
};

type BanRow = {
  id: string;
  email: string;
  ipAddress: string | null;
  bannedAt: string;
  reason: string | null;
};

function PasswordModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSave() {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_password", password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Password updated for ${userName}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="font-bold text-base mb-1">Reset password</h2>
        <p className="text-sm text-muted-foreground mb-4">Set a new password for <span className="font-medium text-foreground">{userName}</span></p>
        <div className="space-y-3">
          <div>
            <Label>New password</Label>
            <div className="relative mt-1">
              <Input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" className="pr-9" />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPwd ? "Hide" : "Show"}>
                {showPwd ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirm password</Label>
            <div className="relative mt-1">
              <Input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" className="pr-9" />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showConfirm ? "Hide" : "Show"}>
                {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving\u2026" : "Set Password"}</Button>
        </div>
      </div>
    </div>
  );
}

function LoginHistoryPopover({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((data) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">Login History</h2>
          <button
            onClick={onClose}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No login history</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={log.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors">
                <span className="text-xs font-mono text-foreground">{log.ipAddress}</span>
                <span className="text-xs text-muted-foreground">
                  {i === 0 && <span className="mr-1.5 px-1 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">latest</span>}
                  {new Date(log.loginAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type RoleCellProps = {
  user: UserRow; isMe: boolean; isPending: boolean; isLocked: boolean;
  setRole: (id: string, role: "admin" | "user") => void;
};
function RoleCell({ user, isMe, isPending, isLocked, setRole }: RoleCellProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {isPending ? (
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-500">Pending</span>
      ) : (
        <>
          {isLocked && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive">Locked</span>
          )}
          <div className="relative group">
            <button
              disabled={isMe}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${user.role === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"} ${isMe ? "cursor-default" : "hover:opacity-80"}`}
            >
              {user.role === "admin" ? "Admin" : "User"}
              {!isMe && <ChevronUpIcon className="h-3 w-3" />}
            </button>
            {!isMe && (
              <div className="absolute right-0 bottom-full mb-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden z-20 hidden group-focus-within:block group-hover:block min-w-[7rem]">
                {(["admin", "user"] as const).map((r) => (
                  <button key={r} onClick={() => setRole(user.id, r)} className={`w-full text-left px-3 py-1.5 text-sm capitalize hover:bg-muted transition-colors ${user.role === r ? "font-semibold text-primary" : ""}`}>
                    {r === "admin" ? "Admin" : "User"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type ActionsCellProps = {
  user: UserRow; isMe: boolean; isPending: boolean; isLocked: boolean;
  setLoginHistoryUser: (u: UserRow) => void;
  setPasswordModalUser: (u: UserRow) => void;
  toggleLock: (u: UserRow) => void;
  approveUser: (u: UserRow) => void;
  denyUser: (id: string, name: string) => void;
  deleteUser: (id: string, name: string) => void;
};
function ActionsCell({ user, isMe, isPending, isLocked, setLoginHistoryUser, setPasswordModalUser, toggleLock, approveUser, denyUser, deleteUser }: ActionsCellProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {isPending ? (
        <>
          <button onClick={() => approveUser(user)} className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors" title="Approve">
            <CheckIcon className="h-3.5 w-3.5" /> Approve
          </button>
          <AlertDialog>
            <AlertDialogTrigger className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Deny and ban">
              <BanIcon className="h-3.5 w-3.5" /> Deny
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deny and ban?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">{user.name}</span> ({user.email}) will be denied and their email and IP added to the ban list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => denyUser(user.id, user.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deny and Ban</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <button onClick={() => setLoginHistoryUser(user)} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Login history">
            <HistoryIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setPasswordModalUser(user)} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Reset password">
            <KeyIcon className="h-3.5 w-3.5" />
          </button>
          {!isMe && (
            <>
              <button onClick={() => toggleLock(user)} className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${isLocked ? "text-amber-400 hover:bg-muted" : "text-muted-foreground hover:text-amber-400 hover:bg-muted"}`} title={isLocked ? "Unlock account" : "Lock account"}>
                {isLocked ? <LockOpenIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
              </button>
              <AlertDialog>
                <AlertDialogTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors" title="Delete user">
                  <TrashIcon className="h-3.5 w-3.5" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <span className="font-medium text-foreground">{user.name}</span> ({user.email}) and all their cards will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteUser(user.id, user.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function UserManagementSection() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalUser, setPasswordModalUser] = useState<UserRow | null>(null);
  const [loginHistoryUser, setLoginHistoryUser] = useState<UserRow | null>(null);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [bansLoading, setBansLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const myId = session?.user?.id;

  useEffect(() => { loadUsers(); loadBans(); }, []);

  function toggleSelectMode() {
    setSelectMode((s) => !s);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const ids = sorted.filter((u) => u.id !== myId).map((u) => u.id);
    setSelectedIds(new Set(ids));
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Forbidden");
      setUsers(await res.json());
    } catch {
      toast.error("Access denied");
    } finally {
      setLoading(false);
    }
  }

  async function loadBans() {
    setBansLoading(true);
    try {
      const res = await fetch("/api/admin/bans");
      if (res.ok) setBans(await res.json());
    } catch {}
    finally { setBansLoading(false); }
  }

  async function unban(id: string) {
    try {
      const res = await fetch("/api/admin/bans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Ban removed");
      loadBans();
    } catch {
      toast.error("Failed to unban");
    }
  }

  async function toggleLock(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_lock" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.locked ? `${user.name} locked` : `${user.name} unlocked`);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function setRole(userId: string, role: "admin" | "user") {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Role updated");
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function approveUser(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${user.name} approved`);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function deleteUser(userId: string, name: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${name} deleted`);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function denyUser(userId: string, name: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${name} denied and banned`);
      loadUsers();
      loadBans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const sorted = [...users].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function bulkApprove() {
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map((id) =>
      fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) })
    ));
    toast.success(`${ids.length} user(s) approved`);
    setSelectedIds(new Set());
    setSelectMode(false);
    loadUsers();
  }

  async function bulkLock() {
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map((id) =>
      fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_lock" }) })
    ));
    toast.success(`${ids.length} user(s) locked`);
    setSelectedIds(new Set());
    setSelectMode(false);
    loadUsers();
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map((id) => fetch(`/api/admin/users/${id}`, { method: "DELETE" })));
    toast.success(`${ids.length} user(s) deleted`);
    setSelectedIds(new Set());
    setSelectMode(false);
    loadUsers();
  }

  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <>
      {passwordModalUser && (
        <PasswordModal
          userId={passwordModalUser.id}
          userName={passwordModalUser.name}
          onClose={() => setPasswordModalUser(null)}
        />
      )}
      {loginHistoryUser && (
        <LoginHistoryPopover
          userId={loginHistoryUser.id}
          onClose={() => setLoginHistoryUser(null)}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Accounts
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">
                    {pendingCount} pending
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">Manage accounts, roles, and access. Pending accounts appear at the top.</CardDescription>
            </div>
            {!loading && sorted.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className={`shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors ${selectMode ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <CheckSquare2Icon className="h-3.5 w-3.5" />
                {selectMode ? "Cancel" : "Select"}
              </button>
            )}
          </div>
          {selectMode && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <button onClick={selectAll} className="text-xs text-primary hover:underline">Select all</button>
              {selectedIds.size > 0 && (
                <>
                  {sorted.filter((u) => selectedIds.has(u.id) && u.status === "pending").length > 0 && (
                    <button onClick={bulkApprove} className="flex items-center gap-1 h-6 px-2 rounded text-xs font-medium bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors">
                      <CheckIcon className="h-3 w-3" /> Approve selected
                    </button>
                  )}
                  <button onClick={bulkLock} className="flex items-center gap-1 h-6 px-2 rounded text-xs font-medium bg-amber-400/10 text-amber-500 hover:bg-amber-400/20 transition-colors">
                    <LockIcon className="h-3 w-3" /> Lock selected
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger className="flex items-center gap-1 h-6 px-2 rounded text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                      <TrashIcon className="h-3 w-3" /> Delete selected
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedIds.size} user(s)?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete all selected accounts and their cards.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Desktop table header — hidden on mobile */}
              <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_7rem_auto] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {selectMode && <span />}
                <span>User</span>
                <span>Email / Last Login</span>
                <span>Role</span>
                <span>Actions</span>
              </div>

              {sorted.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No users found</div>
              )}

              {sorted.map((user) => {
                const isMe = user.id === myId;
                const isLocked = !!user.lockedAt;
                const isPending = user.status === "pending";
                const isSelected = selectedIds.has(user.id);

                return (
                  <div
                    key={user.id}
                    className={`border-b border-border/60 last:border-0 transition-colors ${
                      isPending
                        ? "border-l-2 border-l-amber-400 bg-amber-400/5 hover:bg-amber-400/10"
                        : isLocked
                        ? "opacity-60"
                        : isSelected
                        ? "bg-primary/5"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    {/* ── Desktop row ─────────────────────────────────────── */}
                    <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_7rem_auto] gap-3 items-center px-4 py-3">
                      {selectMode && (
                        <button
                          onClick={() => !isMe && toggleSelect(user.id)}
                          disabled={isMe}
                          className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"} ${isMe ? "opacity-40 cursor-default" : "cursor-pointer"}`}
                          aria-label={isSelected ? "Deselect" : "Select"}
                        >
                          {isSelected && <CheckIcon className="h-3 w-3" />}
                        </button>
                      )}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPending ? "bg-amber-400/10" : "bg-primary/10"}`}>
                          <UserIcon className={`h-4 w-4 ${isPending ? "text-amber-400" : "text-primary"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.name}
                            {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        {user.lastIp ? (
                          <p className="text-xs text-muted-foreground/70 truncate font-mono">
                            {user.lastIp}
                            {user.lastLoginAt && <span className="font-sans ml-1 opacity-70">&#183; {new Date(user.lastLoginAt).toLocaleDateString()}</span>}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/40">No logins recorded</p>
                        )}
                      </div>
                      <RoleCell user={user} isMe={isMe} isPending={isPending} isLocked={isLocked} setRole={setRole} />
                      <ActionsCell user={user} isMe={isMe} isPending={isPending} isLocked={isLocked} setLoginHistoryUser={setLoginHistoryUser} setPasswordModalUser={setPasswordModalUser} toggleLock={toggleLock} approveUser={approveUser} denyUser={denyUser} deleteUser={deleteUser} />
                    </div>

                    {/* ── Mobile card ──────────────────────────────────────── */}
                    <div className="sm:hidden px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {selectMode && (
                            <button
                              onClick={() => !isMe && toggleSelect(user.id)}
                              disabled={isMe}
                              className={`flex items-center justify-center w-5 h-5 rounded border shrink-0 transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"} ${isMe ? "opacity-40 cursor-default" : "cursor-pointer"}`}
                              aria-label={isSelected ? "Deselect" : "Select"}
                            >
                              {isSelected && <CheckIcon className="h-3 w-3" />}
                            </button>
                          )}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isPending ? "bg-amber-400/10" : "bg-primary/10"}`}>
                            <UserIcon className={`h-3.5 w-3.5 ${isPending ? "text-amber-400" : "text-primary"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {user.name}
                              {isMe && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <RoleCell user={user} isMe={isMe} isPending={isPending} isLocked={isLocked} setRole={setRole} />
                      </div>
                      {user.lastIp && (
                        <p className="text-xs font-mono text-muted-foreground/70 truncate pl-0.5">
                          {user.lastIp}
                          {user.lastLoginAt && <span className="font-sans ml-1 opacity-70">&#183; {new Date(user.lastLoginAt).toLocaleDateString()}</span>}
                        </p>
                      )}
                      <div className="flex items-center gap-1 flex-wrap">
                        <ActionsCell user={user} isMe={isMe} isPending={isPending} isLocked={isLocked} setLoginHistoryUser={setLoginHistoryUser} setPasswordModalUser={setPasswordModalUser} toggleLock={toggleLock} approveUser={approveUser} denyUser={denyUser} deleteUser={deleteUser} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Ban List ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BanIcon className="h-4 w-4 text-destructive" />
            Ban List
            {bans.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-destructive/15 text-destructive text-xs font-bold">
                {bans.length}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Banned emails and IPs cannot register or sign in. Remove a ban to allow access again.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {bansLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : bans.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No bans active</div>
          ) : (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Email</span>
                <span>IP / Banned</span>
                <span>Actions</span>
              </div>
              {bans.map((ban) => (
                <div key={ban.id} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                  <p className="text-sm font-mono truncate">{ban.email}</p>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground truncate">{ban.ipAddress ?? "—"}</p>
                    <p className="text-xs text-muted-foreground/60">{new Date(ban.bannedAt).toLocaleDateString()}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title="Remove ban"
                    >
                      Remove ban
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove ban?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <span className="font-medium text-foreground">{ban.email}</span> will be able to register and sign in again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => unban(ban.id)}>
                          Remove Ban
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
