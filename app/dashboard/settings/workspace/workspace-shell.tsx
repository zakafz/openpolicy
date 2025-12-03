"use client";

import { Check, Copy, InfoIcon, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { AiUsageCard } from "@/components/ai-usage-card";
import PageTitle from "@/components/dashboard-page-title";
import { StorageUsageCard } from "@/components/storage-usage-card";
import { SubscriptionAlert } from "@/components/subscription-alert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group-coss";
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
import { FREE_PLAN_LIMITS, PRO_PLAN_LIMITS } from "@/lib/limits";
import { createClient } from "@/lib/supabase/client";

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

    const checkPlan = async () => {
      if (!workspace?.plan) {
        setIsFree(true);
        return;
      }
      try {
        const res = await fetch(`/api/plans/check?planId=${workspace.plan}`);
        if (res.ok) {
          const data = await res.json();
          setIsFree(data.isFree);
        } else {
          setIsFree(true);
        }
      } catch (_error) {
        setIsFree(true);
      }
    };
    checkPlan();

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
    } catch (_error) {
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

  const _validate = () => {
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

      if (section === "domain") {
        const response = await fetch(
          `/api/workspaces/${workspace.id}/domains`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: workspace.id,
              domain: customDomain || null,
              oldDomain: initialValues.customDomain || null,
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update domain");
        }

        if (typeof reload === "function") {
          await reload();
        }

        setInitialValues({ ...initialValues, customDomain });

        window.dispatchEvent(
          new CustomEvent("workspace-changed", {
            detail: { workspaceId: workspace.id },
          }),
        );

        toastManager.add({
          title: "Success!",
          description:
            "Custom domain updated. It may take a few minutes to propagate.",
          type: "success",
        });
      } else {
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

        setInitialValues({
          name,
          logo,
          supportEmail,
          disableIcon,
          returnUrl,
          customDomain,
        });

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

      if (workspace.subscription_id) {
        try {
          const cancelResponse = await fetch(
            "/api/workspace/cancel-subscription",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspaceId: workspace.id }),
            },
          );

          if (!cancelResponse.ok) {
            const errorData = await cancelResponse.json();
            console.error("Failed to cancel subscription:", errorData);
            throw new Error(errorData.error || "Failed to cancel subscription");
          }
        } catch (cancelError: any) {
          console.error("Error canceling subscription:", cancelError);
          throw new Error(
            `Failed to cancel subscription: ${cancelError.message}`,
          );
        }
      }

      const { error: documentsDeleteErr } = await supabase
        .from("documents")
        .delete()
        .eq("workspace_id", workspace.id);

      if (documentsDeleteErr) throw documentsDeleteErr;

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
      } catch (_e) {
        // ignore
      }

      toastManager.add({
        title: "Workspace deleted",
        description: "Your workspace has been removed.",
        type: "success",
      });

      router.push("/create");
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
      } catch (_e) {
        // ignore
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
      <SubscriptionAlert workspace={workspace} />
      {workspace?.metadata?.storage_usage !== undefined && (
        <StorageUsageCard
          usage={workspace.metadata.storage_usage}
          limit={isFree ? FREE_PLAN_LIMITS.storage : PRO_PLAN_LIMITS.storage}
          isFreePlan={isFree}
        />
      )}
      <AiUsageCard
        usage={workspace?.metadata?.ai_usage_count || 0}
        limit={isFree ? FREE_PLAN_LIMITS.ai : PRO_PLAN_LIMITS.ai}
        isFreePlan={isFree}
      />
      {/*Workspace name*/}
      <form onSubmit={(e) => handleSave("general", e)}>
        <Frame>
          <FrameHeader className="flex flex-row items-center justify-between">
            <div>
              <FrameTitle>Workspace</FrameTitle>
              <FrameDescription>Manage workspace settings.</FrameDescription>
            </div>
            <Button
              type="submit"
              size={"sm"}
              className="ml-auto w-fit"
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
                  href="mailto:support@openpolicyhq.com"
                  className="text-primary hover:underline"
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
          <FrameHeader className="flex flex-row items-center justify-between">
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
              className="ml-auto w-fit"
              disabled={!isBrandingDirty || savingMap.branding || fetching}
            >
              {savingMap.branding ? "Saving..." : "Save"}
            </Button>
          </FrameHeader>
          <FramePanel>
            <Field className={"mt-4 flex w-full flex-row items-center gap-2"}>
              <Avatar className="aspect-square size-14 rounded-xl">
                <AvatarImage src={workspace?.logo || ""} alt="Workspace logo" />
                <AvatarFallback className="rounded-xl bg-card" />
              </Avatar>
              <div className="flex w-full flex-col gap-2">
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
              className="mt-4 flex items-center justify-between gap-6 rounded-lg border p-3 has-data-checked:border-blue-500/20 has-data-checked:bg-blue-500/5"
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
          <FrameHeader className="flex flex-row items-center justify-between">
            <div>
              <FrameTitle>Custom Domain</FrameTitle>
              <FrameDescription>
                Connect your own domain to your workspace.
              </FrameDescription>
            </div>
            <Button
              type={isFree ? "button" : "submit"}
              size={"sm"}
              className="ml-auto w-fit"
              disabled={
                (!isDomainDirty && !isFree) || savingMap.domain || fetching
              }
              onClick={isFree ? () => router.push("/pricing") : undefined}
            >
              {isFree ? "Upgrade" : savingMap.domain ? "Saving..." : "Save"}
            </Button>
          </FrameHeader>
          <FramePanel>
            <div className="flex flex-col gap-4">
              {isFree ? (
                <Alert variant={"default"}>
                  <AlertTitle className="flex items-center gap-1">
                    <Sparkles className="size-4" />
                    Custom domains are available on the Scale plan.
                  </AlertTitle>
                  <AlertDescription>
                    Upgrade your workspace to connect your own domain.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="mb-2 font-medium text-sm">
                    DNS Configuration
                  </h4>
                  <p className="mb-4 text-muted-foreground text-sm">
                    To use a custom domain, you need to add a CNAME record to
                    your DNS provider.
                  </p>
                  <div className="relative flex flex-col gap-4 rounded-md border bg-background p-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground text-xs">
                        Type
                      </span>
                      <code className="font-mono text-sm">CNAME</code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground text-xs">
                        Host
                      </span>
                      <code className="font-mono text-sm">
                        {getDnsHost(customDomain)}
                      </code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground text-xs">
                        Value
                      </span>
                      <code className="font-mono text-sm">
                        cname.openpolicyhq.com
                      </code>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-2 text-muted-foreground text-xs">
                    Note that the process can take up to 24 hours to take
                    effect.
                  </div>
                </div>
              )}

              <Field>
                <FieldLabel>Domain Name</FieldLabel>
                <div className="flex w-full gap-2">
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

              {initialValues.customDomain &&
                customDomain === initialValues.customDomain &&
                !isFree && (
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
                    {verificationResult.valid
                      ? "Domain is active"
                      : "Verification failed"}
                  </AlertTitle>
                  {!verificationResult.valid && (
                    <AlertDescription>
                      {verificationResult.message}
                    </AlertDescription>
                  )}
                </Alert>
              )}
            </div>
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
          <FramePanel className="flex items-center justify-between border-destructive/20">
            <div className="flex flex-col gap-0.5">
              <div className="font-medium text-semibold text-sm">
                Delete Workspace
              </div>
              <p className="text-muted-foreground text-sm">
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
                        onClick={(_e) => {
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
