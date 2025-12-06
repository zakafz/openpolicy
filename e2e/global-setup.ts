import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!supabaseUrl || !supabaseKey || !email || !password) {
    const missing = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!email) missing.push("TEST_USER_EMAIL");
    if (!password) missing.push("TEST_USER_PASSWORD");
    throw new Error(
      `Missing environment variables for auth setup: ${missing.join(", ")}`,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !session) {
    throw new Error(`Failed to login in global setup: ${error?.message}`);
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", session.user.id)
    .maybeSingle();

  if (!userRecord) {
    console.log("Creating public user record for test user...");
    const { error: userError } = await supabase.from("users").insert({
      auth_id: session.user.id,
      email: email,
      full_name: "Test User",
      avatar_url: "https://github.com/shadcn.png",
    });

    if (userError) {
      console.warn("Failed to create public user record:", userError);
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSupabase = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : supabase;

  if (!serviceRoleKey) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY not found, using user session for cleanup. This might fail if RLS prevents deletion.",
    );
  }

  const { count: countBefore } = await adminSupabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", session.user.id);
  console.log(`Documents before cleanup: ${countBefore}`);

  const { error: cleanupError } = await adminSupabase
    .from("documents")
    .delete()
    .eq("owner_id", session.user.id);

  if (cleanupError) {
    console.warn("Failed to clean up documents:", cleanupError);
  }

  const { count: countAfter } = await adminSupabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", session.user.id);
  console.log(`Documents after cleanup: ${countAfter}`);

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", session.user.id);

  if (!workspaces || workspaces.length === 0) {
    console.log("Creating default workspace for test user...");
    const { error: wsError } = await supabase.from("workspaces").insert({
      owner_id: session.user.id,
      name: "Default Test Workspace",
      slug: `test-workspace-${Date.now()}`,
      plan: "free",
    });

    if (wsError) {
      console.warn("Failed to create default workspace:", wsError);
    }
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL!);
  await page.waitForLoadState("networkidle");

  const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase/)?.[1];
  if (!projectRef) throw new Error("Could not extract project ref from URL");

  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionStr = JSON.stringify(session);

  await page.context().addCookies([
    {
      name: cookieName,
      value: sessionStr,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: cookieName, value: sessionStr },
  );

  let defaultWorkspaceId =
    workspaces && workspaces.length > 0 ? workspaces[0].id : null;

  if (!defaultWorkspaceId) {
    const { data: newWorkspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", session.user.id)
      .limit(1)
      .single();
    if (newWorkspaces) defaultWorkspaceId = newWorkspaces.id;
  }

  if (defaultWorkspaceId) {
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      { key: "selectedWorkspace", value: defaultWorkspaceId },
    );
  }

  const storageStatePath = storageState as string;
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}

export default globalSetup;
