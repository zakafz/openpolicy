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

export default function GeneralShell() {
  const { selectedWorkspaceId } = useWorkspace();
  const { workspace, loading, error, reload } = useWorkspaceLoader();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [fetching, setFetching] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  // initial values to detect dirty state
  const [initialValues, setInitialValues] = React.useState({
    name: "",
    logo: "",
  });

  React.useEffect(() => {
    setName(workspace?.name ?? "");
    setLogo(workspace?.logo ?? "");
    setInitialValues({
      name: workspace?.name ?? "",
      logo: workspace?.logo ?? "",
    });
    setFetching(false);
  }, [workspace]);

  const isDirty = React.useMemo(() => {
    return (
      name !== (initialValues.name ?? "") || logo !== (initialValues.logo ?? "")
    );
  }, [name, logo, initialValues]);

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
      setInitialValues({ name, logo });

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

  return (
    <>
      <PageTitle
        title="General Settings"
        description="Manage your workspace settings."
      />
      {/*Workspace name*/}
      <form onSubmit={handleSave}>
        <Frame>
          <FrameHeader>
            <FrameTitle>Workspace</FrameTitle>
            <FrameDescription>Manage workspace settings.</FrameDescription>
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
            <Field className={"mt-4"}>
              <FieldLabel>Logo URL</FieldLabel>
              <Input
                type="url"
                placeholder="Logo URL"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                disabled={saving || fetching}
                required
              />
              {/*<FieldError>Please enter a valid name.</FieldError>*/}
            </Field>
          </FramePanel>
          <FrameFooter>
            <Button
              type="submit"
              size={"sm"}
              className="w-fit ml-auto"
              disabled={!isDirty || saving || fetching}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </FrameFooter>
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
