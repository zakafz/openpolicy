import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import Section from "@/components/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <Header />

      <Section className="p-4">
        <div className="flex min-h-screen w-full items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent>
              {params?.error ? (
                <p className="text-muted-foreground text-sm">
                  Code error: {params.error}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  An unspecified error occurred.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>
      <Footer />
    </>
  );
}
