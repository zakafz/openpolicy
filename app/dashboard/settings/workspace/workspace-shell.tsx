"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import PageTitle from "@/components/dashboard-page-title";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { isFreePlan } from "@/lib/limits";
import { Check, Copy, Globe, InfoIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group-coss";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [customDomain, setCustomDomain] = React.useState("");
  const [fetching, setFetching] = React.useState(true);
  const [savingMap, setSavingMap] = React.useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [isFree, setIsFree] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verificationResult, setVerificationResult] = React.useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const switchId = React.useId();

  const [initialValues, setInitialValues] = React.useState({
    name: "",
    logo: "",
    supportEmail: "",
    disableIcon: false,
    returnUrl: "",
    customDomain: "",
  });

  React.useEffect(() => {
    setName(workspace?.name ?? "");
    setLogo(workspace?.logo ?? "");
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
    setCustomDomain(workspace?.custom_domain ?? "");
    setInitialValues({
      name: workspace?.name ?? "",
      logo: workspace?.logo ?? "",
      supportEmail:
        workspace?.support_email ?? workspace?.metadata?.support_email ?? "",
      disableIcon: Boolean(
        workspace?.disable_icon ?? workspace?.metadata?.disable_icon ?? false,
      ),
      returnUrl: workspace?.return_url ?? workspace?.metadata?.return_url ?? "",
      customDomain: workspace?.custom_domain ?? "",
    });

    isFreePlan(workspace?.plan ?? null).then(setIsFree);

    setFetching(false);
  }, [workspace]);

  const handleCopy = () => {
    navigator.clipboard.writeText("cname.openpolicyhq.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toastManager.add({
      title: "Copied!",
      description: "CNAME record copied to clipboard.",
      type: "success",
    });
  };

  const handleVerify = async () => {
    if (!customDomain) return;
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch("/api/workspace/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: customDomain }),
      });
      const data = await res.json();
      setVerificationResult(data);
      if (data.valid) {
        toastManager.add({
          title: "Success!",
          description: "Domain is correctly configured.",
          type: "success",
        });
      } else {
        toastManager.add({
          title: "Verification Failed",
          description: data.message,
          type: "error",
        });
      }
    } catch (error) {
      toastManager.add({
        title: "Error",
        description: "Failed to verify domain.",
        type: "error",
      });
    } finally {
      setVerifying(false);
    }
  };

  const getDnsHost = (domain: string) => {
    if (!domain) return "@";
    const parts = domain.split(".");
    if (parts.length <= 2) return "@";
    return parts.slice(0, -2).join(".");
  };

  const isGeneralDirty = React.useMemo(() => {
    return name !== (initialValues.name ?? "");
  }, [name, initialValues.name]);

  const isBrandingDirty = React.useMemo(() => {
    return (
      logo !== (initialValues.logo ?? "") ||
      supportEmail !== (initialValues.supportEmail ?? "") ||
      disableIcon !== (initialValues.disableIcon ?? false) ||
      returnUrl !== (initialValues.returnUrl ?? "")
    );
  }, [logo, supportEmail, disableIcon, returnUrl, initialValues]);

  const isDomainDirty = React.useMemo(() => {
    return customDomain !== (initialValues.customDomain ?? "");
  }, [customDomain, initialValues.customDomain]);

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

  const handleSave = async (section: string, e?: React.FormEvent) => {
    e?.preventDefault();
    setFieldError(null);

    let isSectionDirty = false;
    if (section === "general") isSectionDirty = isGeneralDirty;
    if (section === "branding") isSectionDirty = isBrandingDirty;
    if (section === "domain") isSectionDirty = isDomainDirty;

    if (!isSectionDirty) {
      // nothing to do
      toastManager.add({
        title: "No changes",
        description: "There are no changes to save.",
        type: "info",
      });
      return;
    }

    setSavingMap((prev) => ({ ...prev, [section]: true }));
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      // Special handling for domain section - use dedicated API
      if (section === "domain") {
        const response = await fetch("/api/workspace/domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: workspace.id,
            domain: customDomain || null,
            oldDomain: initialValues.customDomain || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update domain");
        }

        if (typeof reload === "function") {
          await reload();
        }

        setInitialValues({ ...initialValues, customDomain });

        toastManager.add({
          title: "Success!",
          description: "Custom domain updated. It may take a few minutes to propagate.",
          type: "success",
        });
      } else {
        // Standard handling for other sections
        const payload: any = {
          name,
          logo: logo || null,
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

        if (typeof reload === "function") {
          await reload();
        }

        setInitialValues({ name, logo, supportEmail, disableIcon, returnUrl, customDomain });

        toastManager.add({
          title: "Success!",
          description: "Workspace settings saved.",
          type: "success",
        });
      }
    } catch (err: any) {
      toastManager.add({
        title: "Uh oh! Something went wrong.",
        description: err?.message ?? String(err),
        type: "error",
      });
    } finally {
      setSavingMap((prev) => ({ ...prev, [section]: false }));
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

      router.push("/dashboard");
    } catch (err: any) {
      toastManager.add({
        title: "Uh oh! Could not delete workspace",
        description: err?.message ?? String(err),
        type: "error",
      });
      setDeleting(false);
    }
  };

  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !workspace?.id) return;
    setSavingMap((prev) => ({ ...prev, branding: true }));
    try {
      const filename = file.name.replace(/\s+/g, "-");
      const contentType = file.type || undefined;

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
      toastManager.add({
        title: "Upload failed",
        description: err?.message ?? String(err),
        type: "error",
      });
    } finally {
      setSavingMap((prev) => ({ ...prev, branding: false }));
    }
  };

  return (
    <>
      <PageTitle
        title="Workspace Settings"
        description="Manage your workspace settings."
      />
      {/*Workspace name*/}
      <form onSubmit={(e) => handleSave("general", e)}>
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
              disabled={!isGeneralDirty || savingMap.general || fetching}
            >
              {savingMap.general ? "Saving..." : "Save"}
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
                disabled={savingMap.general || fetching}
                required
              />
              {fieldError && <FieldError>{fieldError}</FieldError>}
            </Field>
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
      <form className="mt-5" onSubmit={(e) => handleSave("branding", e)}>
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
              disabled={!isBrandingDirty || savingMap.branding || fetching}
            >
              {savingMap.branding ? "Saving..." : "Save"}
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
                  disabled={savingMap.branding || fetching}
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

      {/*Custom Domain*/}
      <form className="mt-5" onSubmit={(e) => handleSave("domain", e)}>
        <Frame>
          <FrameHeader className="flex justify-between flex-row items-center">
            <div>
              <FrameTitle>Custom Domain</FrameTitle>
              <FrameDescription>
                Connect your own domain to your workspace.
              </FrameDescription>
            </div>
            <Button
              type={isFree ? "button" : "submit"}
              size={"sm"}
              className="w-fit ml-auto"
              disabled={(!isDomainDirty && !isFree) || savingMap.domain || fetching}
              onClick={isFree ? () => router.push("/pricing") : undefined}
            >
              {isFree ? "Upgrade" : savingMap.domain ? "Saving..." : "Save"}
            </Button>
          </FrameHeader>
          <FramePanel>
            <div className="flex flex-col gap-4">
              {isFree ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-amber-600 font-medium">
                    <Globe className="h-4 w-4" />
                    Upgrade to Pro
                  </div>
                  <p className="mt-1 text-sm text-amber-600/80">
                    Custom domains are available on the Pro plan. Upgrade your workspace to connect your own domain.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="text-sm font-medium mb-2">DNS Configuration</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    To use a custom domain, you need to add a CNAME record to your DNS provider.
                  </p>
                  <div className="flex flex-col gap-4 rounded-md border bg-background relative p-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Type</span>
                      <code className="text-sm font-mono">CNAME</code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Host</span>
                      <code className="text-sm font-mono">{getDnsHost(customDomain)}</code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Value</span>
                      <code className="text-sm font-mono">cname.openpolicyhq.com</code>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 absolute top-2 right-2"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Field>
                <FieldLabel>Domain Name</FieldLabel>
                <div className="flex gap-2 w-full">
                  <InputGroup className="flex-1">
                    <InputGroupInput
                      type="text"
                      placeholder="docs.example.com"
                      value={customDomain}
                      onChange={(e) => {
                        setCustomDomain(e.target.value);
                        setVerificationResult(null);
                      }}
                      disabled={savingMap.domain || fetching || isFree}
                      className="font-mono"
                    />
                    <InputGroupAddon>https://</InputGroupAddon>
                  </InputGroup>
                  {customDomain && !isFree && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomDomain("");
                        setVerificationResult(null);
                      }}
                      disabled={savingMap.domain || fetching}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <FieldDescription>
                  Enter the domain you want to use (e.g. docs.example.com).
                </FieldDescription>
              </Field>

              {/* Only show Verify button if domain is saved to database */}
              {initialValues.customDomain && customDomain === initialValues.customDomain && !isFree && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerify}
                    disabled={verifying || !customDomain}
                  >
                    {verifying ? "Verifying..." : "Verify Connection"}
                  </Button>
                </div>
              )}

              {verificationResult && customDomain && (
                <Alert variant={verificationResult.valid ? "success" : "error"}>
                  {verificationResult.valid ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <InfoIcon className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {verificationResult.valid ? "Domain is active" : "Verification failed"}
                  </AlertTitle>
                  {!verificationResult.valid && (
                    <AlertDescription>{verificationResult.message}</AlertDescription>
                  )}
                </Alert>
              )}
            </div>
          </FramePanel>
        </Frame>
      </form>

      {/*Workspace delete*/}
      < div className="mt-5" >
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
      </div >
    </>
  );
}
