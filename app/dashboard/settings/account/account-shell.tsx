"use client";

import * as React from "react";
import PageTitle from "@/components/dashboard-page-title";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import useWorkspaceLoader from "@/hooks/use-workspace-loader";
import { useWorkspace } from "@/context/workspace";
import {
  ErrorWorkspace,
  LoadingWorkspace,
  NoSelectedWorkspace,
  NoWorkspace,
} from "@/components/workspace-states";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { UsersRow } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { toastManager } from "@/components/ui/toast";

export default function AccountShell() {
  const { selectedWorkspaceId } = useWorkspace();
  const { workspace, loading, error } = useWorkspaceLoader();
  const router = useRouter();

  const [profile, setProfile] = React.useState<UsersRow | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [provider, setProvider] = React.useState<string | null>(null);

  // Track initial values so we can disable save when nothing changed
  const [initialValues, setInitialValues] = React.useState({
    fullName: "",
    avatarUrl: "",
  });

  const isDirty = React.useMemo(() => {
    return (
      fullName !== (initialValues.fullName ?? "") ||
      avatarUrl !== (initialValues.avatarUrl ?? "")
    );
  }, [fullName, avatarUrl, initialValues]);

  const [fetching, setFetching] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Load current user profile from Supabase (browser client)
    const loadProfile = async () => {
      setFetching(true);
      setErrorMsg(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          setProfile(null);
          setErrorMsg("Not authenticated");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name ?? "");
          setAvatarUrl(profileData.avatar_url ?? "");
          setEmail(profileData.email ?? "");
          setProvider(profileData.provider ?? null);
          // Set initial values after loading so we can detect changes
          setInitialValues({
            fullName: profileData.full_name ?? "",
            avatarUrl: profileData.avatar_url ?? "",
          });
        } else {
          // No profile record yet, seed from auth info if possible
          setProfile(null);
          setFullName("");
          setAvatarUrl("");
          setEmail(user.email ?? "");
          setProvider(null);
          setInitialValues({ fullName: "", avatarUrl: "" });
        }
      } catch (err: any) {
        setErrorMsg(err?.message ?? String(err));
      } finally {
        setFetching(false);
      }
    };

    loadProfile();
  }, []);

  if (!selectedWorkspaceId) {
    return <NoSelectedWorkspace />;
  }
  if (loading) {
    return <LoadingWorkspace />;
  }
  if (error) {
    return <ErrorWorkspace error={error} />;
  }
  if (!workspace) {
    return <NoWorkspace />;
  }

  const supabase = createClient();

  const validate = () => {
    setFieldError(null);
    if (!fullName.trim()) {
      setFieldError("Full name is required.");
      return false;
    }
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      setFieldError("Avatar URL must be a valid URL (http/https).");
      return false;
    }
    return true;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMsg(null);

    if (!validate()) return;

    // If nothing changed, don't call the API
    if (!isDirty) return;

    setSaving(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      // Update the auth user (email and user metadata) so Supabase Auth stays in sync.
      // We only send the fields if they are present; updateUser expects undefined for unchanged fields.
      const updatePayload: {
        email?: string;
        password?: string;
        data?: Record<string, any>;
      } = {
        email: email || undefined,
        data: {
          full_name: fullName || undefined,
          avatar_url: avatarUrl || undefined,
        },
      };

      const { data: authUpdateData, error: authUpdateErr } =
        await supabase.auth.updateUser(updatePayload);

      if (authUpdateErr) {
        // If the auth update fails (e.g. email requires confirmation or other error),
        // surface the error so the user can act on it.
        throw authUpdateErr;
      }

      // Use upsert so we create a row in the users table if one doesn't exist yet.
      const upsertPayload: Partial<UsersRow> = {
        auth_id: user.id,
        full_name: fullName || null,
        avatar_url: avatarUrl || null,
        email: email || null,
        provider: provider || null,
      };

      const { error: upsertErr } = await supabase
        .from("users")
        .upsert(upsertPayload, { onConflict: "auth_id" });

      if (upsertErr) throw upsertErr;

      // Refresh local profile
      const { data: refreshed, error: refreshErr } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (refreshErr) throw refreshErr;
      setProfile(refreshed ?? null);

      // Update initial values to reflect saved state and clear dirty flag
      setInitialValues({
        fullName: fullName || "",
        avatarUrl: avatarUrl || "",
      });

      // Dispatch a global event so other UI (e.g. NavUser) can update live
      try {
        window.dispatchEvent(
          new CustomEvent("user:updated", {
            detail: {
              id: profile?.id ?? null,
              auth_id: user.id,
              full_name: fullName || null,
              avatar_url: avatarUrl || null,
              email: email || null,
              updated_at: new Date().toISOString(),
            },
          }),
        );
      } catch (e) {
        // ignore (safe-guard for non-browser environments)
      }

      // Success toast
      toastManager.add({
        title: "Success!",
        description: "Your changes have been saved.",
        type: "success",
      });
    } catch (err: any) {
      setErrorMsg(err?.message ?? String(err));

      // Error toast
      toastManager.add({
        title: "Uh oh! Something went wrong.",
        description: err?.message ?? String(err),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e?: React.FormEvent) => {
    // This handler is now intended to be called from an AlertDialog action button.
    // It no longer prompts with window.confirm; the dialog handles confirmation.
    e?.preventDefault?.();
    setErrorMsg(null);
    setDeleting(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      // Delete DB profile row
      const { error: deleteErr } = await supabase
        .from("users")
        .delete()
        .eq("auth_id", user.id);

      if (deleteErr) throw deleteErr;

      // Sign out the user
      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) throw signOutErr;

      // Redirect to homepage (or login)
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err?.message ?? String(err));
      setDeleting(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Account Settings"
        description="Manage your account details and preferences."
      />

      <form onSubmit={handleSave}>
        <Frame>
          <FrameHeader className="flex justify-between flex-row items-center">
            <div>
              <FrameTitle>Account</FrameTitle>
              <FrameDescription>Manage account settings.</FrameDescription>
            </div>
            <Button
              type="submit"
              size={"sm"}
              className="w-fit ml-auto h-fit"
              disabled={fetching || saving || !isDirty}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </FrameHeader>
          <FramePanel>
            <Field>
              <FieldLabel>Full Name</FieldLabel>
              <Input
                type="text"
                placeholder="Your full name"
                disabled={fetching || saving}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              {fieldError && <FieldError>{fieldError}</FieldError>}
            </Field>

            <Field className={"mt-4"}>
              <FieldLabel>Avatar URL</FieldLabel>
              <Input
                type="url"
                placeholder="https://example.com/avatar.png"
                disabled={fetching || saving}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </Field>

            <Field className={"mt-4"}>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                placeholder="you@example.com"
                disabled
                value={email}
              />
            </Field>

            <Field className={"mt-4"}>
              <FieldLabel>Provider</FieldLabel>
              <Badge className="capitalize" variant={"secondary"}>
                {provider}
              </Badge>
            </Field>

            {errorMsg && (
              <div className="text-sm text-destructive mt-3">{errorMsg}</div>
            )}
          </FramePanel>
        </Frame>
      </form>

      <div className="mt-5">
        <Frame className="bg-destructive/10">
          <FrameHeader>
            <FrameTitle className="text-destructive">Danger Zone</FrameTitle>
            <FrameDescription className="text-destructive">
              Actions made here are irreversible.
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="flex justify-between items-center border-destructive/20">
            <div className="flex flex-col gap-0.5">
              <div className="text-sm font-medium text-semibold">
                Delete Account
              </div>
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. You will
                be signed out immediately.
              </p>
            </div>

            {/* Alert dialog for destructive confirmation */}
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="destructive-outline" />}
              >
                Delete my account
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove your profile record from our
                    database. You will be signed out immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="ghost" />}>
                    Cancel
                  </AlertDialogClose>
                  <AlertDialogClose
                    render={
                      <Button
                        variant="destructive"
                        onClick={(e) => {
                          // call the same delete handler; the dialog close will also be triggered
                          handleDeleteAccount();
                        }}
                        disabled={deleting}
                      />
                    }
                  >
                    {deleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogClose>
                </AlertDialogFooter>
              </AlertDialogPopup>
            </AlertDialog>
          </FramePanel>
        </Frame>
      </div>
    </>
  );
}
