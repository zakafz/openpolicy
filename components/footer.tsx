import Image from "next/image";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

export function Footer() {
  const links = [
    {
      title: "Log in",
      href: "/auth/login",
    },
    {
      title: "Pricing",
      href: "/pricing",
    },
    {
      title: "Contact us",
      href: "/contact",
    },
    {
      title: "Changelog",
      href: "https://more.openpolicyhq.com/changelog",
    },
    {
      title: "What's OpenPolicy?",
      href: "https://more.openpolicyhq.com/whats-openpolicy",
    },
  ];

  const legal = [
    {
      title: "Privacy Policy",
      href: "https://more.openpolicyhq.com/privacy-policy",
    },
    {
      title: "Terms of Service",
      href: "https://more.openpolicyhq.com/terms-of-service",
    },
  ];

  return (
    <footer className="flex w-full">
      <div className="h-[full] min-w-4 grow border-r" />
      <div className={cn("h-fit w-full max-w-6xl pt-5 pb-14")}>
        <div className="grid h-full max-w-5xl grid-cols-6 gap-6 p-4">
          <div className="col-span-6 flex h-full flex-col gap-4 pt-5 md:col-span-4">
            <a className="w-max" href="/">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={32}
                height={32}
                className="h-7 max-h-7 min-h-7 w-full"
              />
            </a>
            <p className="max-w-sm text-balance font-mono text-muted-foreground text-sm">
              Host, manage, and update your policies and documents.
            </p>
            <Separator orientation="vertical" className={"flex-1"} />
            <p className="mt-auto font-light text-muted-foreground text-xs">
              &copy; {new Date().getFullYear()} OpenPolicy, All rights reserved
            </p>
          </div>
          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-muted-foreground text-xs">Links</span>
            <div className="mt-2 flex flex-col gap-2">
              {links.map(({ href, title }) => (
                <a
                  className="w-max text-sm hover:underline"
                  href={href}
                  key={title}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>
          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-muted-foreground text-xs">Legal</span>
            <div className="mt-2 flex flex-col gap-2">
              {legal.map(({ href, title }) => (
                <a
                  className="w-max text-sm hover:underline"
                  href={href}
                  key={title}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-[full] min-w-4 grow border-l" />
    </footer>
  );
}
