import {
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function Footer() {
  const company = [
    {
      title: "About Us",
      href: "#",
    },
    {
      title: "Careers",
      href: "#",
    },
    {
      title: "Brand assets",
      href: "#",
    },
    {
      title: "Privacy Policy",
      href: "#",
    },
    {
      title: "Terms of Service",
      href: "#",
    },
  ];

  const resources = [
    {
      title: "Blog",
      href: "#",
    },
    {
      title: "Help Center",
      href: "#",
    },
    {
      title: "Contact Support",
      href: "#",
    },
    {
      title: "Community",
      href: "#",
    },
    {
      title: "Security",
      href: "#",
    },
  ];

  const socialLinks = [
    {
      icon: FacebookIcon,
      link: "#",
    },
    {
      icon: GithubIcon,
      link: "#",
    },
    {
      icon: InstagramIcon,
      link: "#",
    },
    {
      icon: LinkedinIcon,
      link: "#",
    },
    {
      icon: TwitterIcon,
      link: "#",
    },
    {
      icon: YoutubeIcon,
      link: "#",
    },
  ];
  return (
    <footer className="relative flex h-fit">
      <div className="w-36 border-r" />
      <div className={cn("mx-auto w-full h-fit pb-20 pt-5")}>
        <div className="grid max-w-5xl grid-cols-6 gap-6 p-4 h-full">
          <div className="col-span-6 flex flex-col gap-4 pt-5 md:col-span-4">
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
              A comprehensive financial technology platform.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((item, index) => (
                <Button
                  key={`social-${item.link}-${index}`}
                  size="icon-sm"
                  variant="outline"
                >
                  <a href={item.link} target="_blank">
                    <item.icon className="size-3.5" />
                  </a>
                </Button>
              ))}
            </div>
            <p className="font-light text-muted-foreground text-xs mt-auto">
              &copy; {new Date().getFullYear()} OpenPolicy, All rights reserved
            </p>
          </div>
          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-muted-foreground text-xs">Resources</span>
            <div className="mt-2 flex flex-col gap-2">
              {resources.map(({ href, title }) => (
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
            <span className="text-muted-foreground text-xs">Company</span>
            <div className="mt-2 flex flex-col gap-2">
              {company.map(({ href, title }) => (
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
      <div className="w-36  border-l " />
    </footer>
  );
}
