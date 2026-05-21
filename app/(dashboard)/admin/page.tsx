"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShieldIcon, LockIcon, LockOpenIcon, KeyIcon, TrashIcon, ChevronDownIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalUser, setPasswordModalUser] = useState<UserRow | null>(null);

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

  const myId = session?.user?.id;

  return (
    <>
      {passwordModalUser && (
        <PasswordModal
          userId={passwordModalUser.id}
          userName={passwordModalUser.name}
          onClose={() => setPasswordModalUser(null)}
        />
      )}

      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <ShieldIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage accounts, roles, and access</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>User</span>
              <span>Email</span>
              <span>Role</span>
              <span>Actions</span>
            </div>

            {users.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">No users found</div>
            )}

            {users.map((user) => {
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
      </div>
    </>
  );
}
