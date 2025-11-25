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
      title: "What's OpenPolicy?",
      href: "https://docs.openpolicyhq.com/whats-openpolicy",
    }

  ];

  const legal = [
    {
      title: "Privacy Policy",
      href: "https://docs.openpolicyhq.com/privacy-policy",
    },
    {
      title: "Terms of Service",
      href: "https://docs.openpolicyhq.com/terms-of-service",
    }
  ];

  return (
    <footer className="flex w-full">
      <div className="h-[full] min-w-4 flex-grow border-r" />
      <div className={cn("w-full max-w-6xl h-fit pb-20 pt-5")}>
        <div className="grid max-w-5xl grid-cols-6 gap-6 p-4 h-full">
          <div className="col-span-6 flex flex-col h-full gap-4 pt-5 md:col-span-4">
            <a className="w-max" href="/">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={32}
                height={32}
                className="h-7 w-fit"
              />
            </a>
            <p className="max-w-sm text-balance font-mono text-muted-foreground text-sm">
              Host, manage, and update your policies and documents.
            </p>
            <Separator orientation="vertical" className={"flex-1"} />
            <p className="font-light text-muted-foreground text-xs mt-auto">
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
      <div className="h-[full] min-w-4 flex-grow border-l" />
    </footer>
  );
}
