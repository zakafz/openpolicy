"use client";

import * as React from "react";
import PageTitle from "@/components/dashboard-page-title";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
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
import { toastManager } from "@/components/ui/toast";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function WorkspaceShell() {
  const { selectedWorkspaceId } = useWorkspace();
  const { workspace, loading, error, reload } = useWorkspaceLoader();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [supportEmail, setSupportEmail] = React.useState("");
  const [disableIcon, setDisableIcon] = React.useState(false);
  const [returnUrl, setReturnUrl] = React.useState("");
  const [fetching, setFetching] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const switchId = React.useId();

  // initial values to detect dirty state
  const [initialValues, setInitialValues] = React.useState({
    name: "",
    logo: "",
    supportEmail: "",
    disableIcon: false,
    returnUrl: "",
  });

  React.useEffect(() => {
    setName(workspace?.name ?? "");
    setLogo(workspace?.logo ?? "");
    // read support email / disable icon / return url from dedicated columns if present,
    // otherwise fallback to metadata keys for backward compatibility.
    setSupportEmail(
      workspace?.support_email ?? workspace?.metadata?.support_email ?? "",
    );
    setDisableIcon(
      Boolean(
        workspace?.disable_icon ?? workspace?.metadata?.disable_icon ?? false,
      ),
    );
    setReturnUrl(
      workspace?.return_url ?? workspace?.metadata?.return_url ?? "",
    );
    setInitialValues({
      name: workspace?.name ?? "",
      logo: workspace?.logo ?? "",
      supportEmail:
        workspace?.support_email ?? workspace?.metadata?.support_email ?? "",
      disableIcon: Boolean(
        workspace?.disable_icon ?? workspace?.metadata?.disable_icon ?? false,
      ),
      returnUrl: workspace?.return_url ?? workspace?.metadata?.return_url ?? "",
    });
    setFetching(false);
  }, [workspace]);

  const isDirty = React.useMemo(() => {
    return (
      name !== (initialValues.name ?? "") ||
      logo !== (initialValues.logo ?? "") ||
      supportEmail !== (initialValues.supportEmail ?? "") ||
      disableIcon !== (initialValues.disableIcon ?? false) ||
      returnUrl !== (initialValues.returnUrl ?? "")
    );
  }, [name, logo, supportEmail, disableIcon, returnUrl, initialValues]);

  if (!selectedWorkspaceId) {
    return <NoSelectedWorkspace />;
  }
  if (loading || fetching) {
    return <LoadingWorkspace />;
  }
  if (error) {
    return <ErrorWorkspace error={error} />;
  }
  if (!workspace) {
    return <NoWorkspace />;
  }

  const validate = () => {
    setFieldError(null);
    if (!name || !name.trim()) {
      setFieldError("Workspace name is required.");
      return false;
    }
    if (logo && !/^https?:\/\//i.test(logo)) {
      setFieldError("Logo must be a valid URL (http/https).");
      return false;
    }
    return true;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFieldError(null);

    if (!validate()) return;
    if (!isDirty) {
      // nothing to do
      toastManager.add({
        title: "No changes",
        description: "There are no changes to save.",
        type: "info",
      });
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const payload: any = {
        name,
        logo: logo || null,
        // Persist new workspace settings:
        support_email: supportEmail || null,
        disable_icon: disableIcon,
        return_url: returnUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from("workspaces")
        .update(payload)
        .eq("id", workspace.id);

      if (updateErr) throw updateErr;

      // reload workspace data
      if (typeof reload === "function") {
        await reload();
      }

      // update initial values
      setInitialValues({ name, logo, supportEmail, disableIcon, returnUrl });

      toastManager.add({
        title: "Success!",
        description: "Workspace settings saved.",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      toastManager.add({
        title: "Uh oh! Something went wrong.",
        description: err?.message ?? String(err),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const { error: deleteErr } = await supabase
        .from("workspaces")
        .delete()
        .eq("id", workspace.id);

      if (deleteErr) throw deleteErr;

      // Notify listeners that the workspace selection/listing may have changed (workspace removed)
      try {
        window.dispatchEvent(
          new CustomEvent("workspace-changed", {
            detail: { id: null, workspace: null },
          }),
        );
      } catch (e) {
        // ignore
      }

      toastManager.add({
        title: "Workspace deleted",
        description: "Your workspace has been removed.",
        type: "success",
      });

      // navigate away (to dashboard or create)
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      toastManager.add({
        title: "Uh oh! Could not delete workspace",
        description: err?.message ?? String(err),
        type: "error",
      });
      setDeleting(false);
    }
  };

  // Upload handler for workspace logo - send file as base64 to server endpoint (/api/workspace/upload-logo)
  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !workspace?.id) return;
    setSaving(true);
    try {
      const filename = file.name.replace(/\s+/g, "-");
      const contentType = file.type || undefined;

      // helper: read file as data URL then extract base64 portion
      const toBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const commaIndex = result.indexOf(",");
            const base64 =
              commaIndex >= 0 ? result.slice(commaIndex + 1) : result;
            resolve(base64);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(f);
        });

      const fileBase64 = await toBase64(file);

      // Send base64 payload to server endpoint which will validate ownership and upload via service client
      const resp = await fetch("/api/workspace/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          filename,
          contentType,
          fileBase64,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error ?? `Server responded with ${resp.status}`);
      }

      const data = await resp.json().catch(() => ({}));
      const publicURL = data?.publicURL ?? "";

      // update local state & reload workspace data
      setLogo(publicURL ?? "");
      try {
        if (typeof reload === "function") await reload();
      } catch (e) {
        // ignore reload errors
      }

      toastManager.add({
        title: "Logo updated",
        description: "Workspace logo uploaded successfully.",
        type: "success",
      });
    } catch (err: any) {
      console.error("Logo upload failed", err);
      toastManager.add({
        title: "Upload failed",
        description: err?.message ?? String(err),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Workspace Settings"
        description="Manage your workspace settings."
      />
      {/*Workspace name*/}
      <form onSubmit={handleSave}>
        <Frame>
          <FrameHeader className="flex justify-between flex-row items-center">
            <div>
              <FrameTitle>Workspace</FrameTitle>
              <FrameDescription>Manage workspace settings.</FrameDescription>
            </div>
            <Button
              type="submit"
              size={"sm"}
              className="w-fit ml-auto"
              disabled={!isDirty || saving || fetching}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </FrameHeader>
          <FramePanel>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                type="text"
                placeholder="Workspace name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving || fetching}
                required
              />
              {fieldError && <FieldError>{fieldError}</FieldError>}
            </Field>
            {/*<Field className={"mt-4"}>
              <FieldLabel>Logo URL</FieldLabel>
              <Input
                type="url"
                placeholder="Logo URL"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                disabled={saving || fetching}
                required
              />
            </Field>*/}
            <Field className={"mt-4"}>
              <FieldLabel>Slug</FieldLabel>
              <Input
                type="text"
                placeholder="slug"
                value={workspace?.slug || ""}
                disabled={true}
                required
              />
              <FieldDescription>
                <a
                  href="mailto:support@openpolicy.com"
                  className="hover:underline text-primary"
                >
                  Contact us
                </a>{" "}
                if you need to change the slug.
              </FieldDescription>
            </Field>
          </FramePanel>
        </Frame>
      </form>
      {/*Workspace branding*/}
      <form className="mt-5" onSubmit={handleSave}>
        <Frame>
          <FrameHeader className="flex justify-between flex-row items-center">
            <div>
              <FrameTitle>Documents Page Branding</FrameTitle>
              <FrameDescription>
                Manage your workspace branding. Customize the appearance of your
                documents header.
              </FrameDescription>
            </div>
            <Button
              type="submit"
              size={"sm"}
              className="w-fit ml-auto"
              disabled={!isDirty || saving || fetching}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </FrameHeader>
          <FramePanel>
            <Field className={"mt-4 flex flex-row gap-2 w-full items-center"}>
              <Avatar className="size-14 rounded-xl aspect-square">
                <AvatarImage src={workspace?.logo || ""} alt="Workspace logo" />
                <AvatarFallback className="bg-card rounded-xl" />
              </Avatar>
              <div className="w-full flex flex-col gap-2">
                <FieldLabel>Upload Logo</FieldLabel>
                <Input
                  type="file"
                  placeholder="Logo File"
                  accept="image/*"
                  disabled={saving || fetching}
                  onChange={handleLogoFileChange}
                />
              </div>
            </Field>
            <Label
              className="flex mt-4 items-center justify-between gap-6 border rounded-lg p-3 has-data-checked:border-blue-500/20 has-data-checked:bg-blue-500/5"
              htmlFor={switchId}
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm leading-4">Disable Icon</p>
                <p className="text-muted-foreground text-xs">
                  You will only see the workspace name in the header of the
                  documents.
                </p>
              </div>
              <Switch
                checked={disableIcon}
                id={switchId}
                onCheckedChange={(v: any) => setDisableIcon(Boolean(v))}
              />
            </Label>
            <Field className={"mt-4"}>
              <FieldLabel>Support Email</FieldLabel>
              <Input
                type="email"
                placeholder="support@example.com"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
              <FieldDescription>
                The email address where users can reach out for support.
                (Contact us button in the header)
              </FieldDescription>
            </Field>
            <Field className={"mt-4"}>
              <FieldLabel>Return URL</FieldLabel>
              <Input
                type="url"
                placeholder="https://example.com"
                value={returnUrl}
                onChange={(e) => setReturnUrl(e.target.value)}
              />
              <FieldDescription>
                Enter the URL where users will be redirected when clicking on
                the back button.
              </FieldDescription>
            </Field>
          </FramePanel>
        </Frame>
      </form>
      {/*Workspace delete*/}
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
                Delete Workspace
              </div>
              <p className="text-sm text-muted-foreground">
                Once you delete a workspace, there is no going back. Please be
                certain.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="destructive-outline" />}
              >
                Delete "{initialValues.name || name}"
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your workspace and remove its data from our servers.
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
                          // perform deletion; dialog will close automatically
                          performDelete();
                        }}
                        disabled={deleting}
                      />
                    }
                  >
                    {deleting ? "Deleting..." : "Delete Workspace"}
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
