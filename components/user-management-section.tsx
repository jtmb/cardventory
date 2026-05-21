"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LockIcon, LockOpenIcon, KeyIcon, TrashIcon, ChevronDownIcon, UserIcon, CheckIcon, XIcon } from "lucide-react";
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
};

function PasswordModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

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
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" className="mt-1" />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" className="mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Set Password"}</Button>
        </div>
      </div>
    </div>
  );
}

export function UserManagementSection() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalUser, setPasswordModalUser] = useState<UserRow | null>(null);
  const myId = session?.user?.id;

  useEffect(() => { loadUsers(); }, []);

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

  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status !== "pending");

  const PENDING_PAGE_SIZE = 4;
  const [pendingPage, setPendingPage] = useState(1);
  const pendingPageCount = Math.max(1, Math.ceil(pending.length / PENDING_PAGE_SIZE));
  const pendingSlice = pending.slice((pendingPage - 1) * PENDING_PAGE_SIZE, pendingPage * PENDING_PAGE_SIZE);

  return (
    <>
      {passwordModalUser && (
        <PasswordModal
          userId={passwordModalUser.id}
          userName={passwordModalUser.name}
          onClose={() => setPasswordModalUser(null)}
        />
      )}

      {/* Pending approvals */}
      {!loading && pending.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">{pending.length}</span>
              Pending Approval
            </CardTitle>
            <CardDescription>These accounts are awaiting admin approval before they can sign in.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              {pendingSlice.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
                    <UserIcon className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => approveUser(user)}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors"
                      title="Approve"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Deny"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                        Deny
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deny and delete?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <span className="font-medium text-foreground">{user.name}</span> ({user.email}) will be permanently removed. They will need to register again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUser(user.id, user.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deny &amp; Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
            {pendingPageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  {(pendingPage - 1) * PENDING_PAGE_SIZE + 1}–{Math.min(pendingPage * PENDING_PAGE_SIZE, pending.length)} of {pending.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                    disabled={pendingPage === 1}
                    className="h-6 px-2 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-muted-foreground px-1">{pendingPage} / {pendingPageCount}</span>
                  <button
                    onClick={() => setPendingPage((p) => Math.min(pendingPageCount, p + 1))}
                    disabled={pendingPage === pendingPageCount}
                    className="h-6 px-2 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts</CardTitle>
          <CardDescription>Manage accounts, roles, and access.</CardDescription>
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
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>User</span>
                <span>Email</span>
                <span>Role</span>
                <span>Actions</span>
              </div>

              {active.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No users found</div>
              )}

              {active.map((user) => {
                const isMe = user.id === myId;
                const isLocked = !!user.lockedAt;
                return (
                  <div
                    key={user.id}
                    className={`grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-4 py-3 border-b border-border/60 last:border-0 transition-colors ${isLocked ? "opacity-60" : "hover:bg-muted/20"}`}
                  >
                    {/* User info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.name}
                          {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>

                    {/* Role badge */}
                    <div className="flex items-center gap-1.5">
                      {isLocked && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive">Locked</span>
                      )}
                      <div className="relative group">
                        <button
                          disabled={isMe}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                            user.role === "admin"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          } ${isMe ? "cursor-default" : "hover:opacity-80"}`}
                        >
                          {user.role === "admin" ? "Admin" : "User"}
                          {!isMe && <ChevronDownIcon className="h-3 w-3" />}
                        </button>
                        {!isMe && (
                          <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden z-10 hidden group-focus-within:block group-hover:block min-w-[7rem]">
                            {(["admin", "user"] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => setRole(user.id, r)}
                                className={`w-full text-left px-3 py-1.5 text-sm capitalize hover:bg-muted transition-colors ${user.role === r ? "font-semibold text-primary" : ""}`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPasswordModalUser(user)}
                        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Reset password"
                      >
                        <KeyIcon className="h-3.5 w-3.5" />
                      </button>
                      {!isMe && (
                        <>
                          <button
                            onClick={() => toggleLock(user)}
                            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                              isLocked
                                ? "text-amber-400 hover:bg-muted"
                                : "text-muted-foreground hover:text-amber-400 hover:bg-muted"
                            }`}
                            title={isLocked ? "Unlock account" : "Lock account"}
                          >
                            {isLocked ? <LockOpenIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                              title="Delete user"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <span className="font-medium text-foreground">{user.name}</span> ({user.email}) and all their cards will be permanently deleted. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id, user.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
