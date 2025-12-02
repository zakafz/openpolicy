"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import PageTitle from "@/components/dashboard-page-title";
import { SubscriptionAlert } from "@/components/subscription-alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import {
  ErrorWorkspace,
  LoadingWorkspace,
  NoSelectedWorkspace,
  NoWorkspace,
} from "@/components/workspace-states";
import { useWorkspace } from "@/context/workspace";
import useWorkspaceLoader from "@/hooks/use-workspace-loader";
import { createClient } from "@/lib/supabase/client";
import type { UsersRow } from "@/types/supabase";

export default function AccountShell() {
  const { selectedWorkspaceId } = useWorkspace();
  const { workspace, loading, error } = useWorkspaceLoader();
  const router = useRouter();

  const [profile, setProfile] = React.useState<UsersRow | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [provider, setProvider] = React.useState<string | null>(null);

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
          setInitialValues({
            fullName: profileData.full_name ?? "",
            avatarUrl: profileData.avatar_url ?? "",
          });
        } else {
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

    if (!isDirty) return;

    setSaving(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

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
        throw authUpdateErr;
      }

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

      const { data: refreshed, error: refreshErr } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (refreshErr) throw refreshErr;
      setProfile(refreshed ?? null);

      setInitialValues({
        fullName: fullName || "",
        avatarUrl: avatarUrl || "",
      });

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
      } catch (_e) {}

      toastManager.add({
        title: "Success!",
        description: "Your changes have been saved.",
        type: "success",
      });
    } catch (err: any) {
      setErrorMsg(err?.message ?? String(err));

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

      const { data: ownedWorkspaces, error: workspacesErr } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id);

      if (workspacesErr) throw workspacesErr;

      if (ownedWorkspaces && ownedWorkspaces.length > 0) {
        const workspaceIds = ownedWorkspaces.map((w) => w.id);

        const { error: docsErr } = await supabase
          .from("documents")
          .delete()
          .in("workspace_id", workspaceIds);

        if (docsErr) throw docsErr;
      }

      const { error: workspacesDeleteErr } = await supabase
        .from("workspaces")
        .delete()
        .eq("owner_id", user.id);

      if (workspacesDeleteErr) throw workspacesDeleteErr;

      const { error: pendingErr } = await supabase
        .from("pending_workspaces")
        .delete()
        .eq("owner_id", user.id);

      if (pendingErr) throw pendingErr;

      const { error: deleteErr } = await supabase
        .from("users")
        .delete()
        .eq("auth_id", user.id);

      if (deleteErr) throw deleteErr;

      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) throw signOutErr;

      router.push("/");
    } catch (err: any) {
      setErrorMsg(err?.message ?? String(err));
      setDeleting(false);
    }
  };

  return (
    <>
      <SubscriptionAlert workspace={workspace} />
      <PageTitle
        title="Account Settings"
        description="Manage your account details and preferences."
      />

      <form onSubmit={handleSave}>
        <Frame>
          <FrameHeader className="flex flex-row items-center justify-between">
            <div>
              <FrameTitle>Account</FrameTitle>
              <FrameDescription>Manage account settings.</FrameDescription>
            </div>
            <Button
              type="submit"
              size={"sm"}
              className="ml-auto h-fit w-fit"
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
              <div className="mt-3 text-destructive text-sm">{errorMsg}</div>
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
          <FramePanel className="flex items-center justify-between border-destructive/20">
            <div className="flex flex-col gap-0.5">
              <div className="font-medium text-semibold text-sm">
                Delete Account
              </div>
              <p className="text-muted-foreground text-sm">
                Once you delete your account, there is no going back. You will
                be signed out immediately.
              </p>
            </div>

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
                        onClick={(_e) => {
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
