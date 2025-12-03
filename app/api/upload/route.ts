import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new NextResponse("Upload failed", { status: 500 });
    }

    // Since the user requested a private bucket, we use a signed URL.
    // We set a long expiry (10 years) to mimic a permanent URL.
    // Ideally, for a private bucket, you'd serve images via a proxy API to check permissions,
    // but a long-lived signed URL is a common workaround for editors.
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("documents")
        .createSignedUrl(fileName, 315360000); // 10 years

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return new NextResponse("Failed to generate URL", { status: 500 });
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Internal upload error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
