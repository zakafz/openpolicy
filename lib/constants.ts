import {
  Cookie,
  GlobeIcon,
  Handshake,
  LayersIcon,
  type LucideIcon,
  NotebookPen,
  Shield,
  TicketX,
  Truck,
} from "lucide-react";
export const DOCUMENT_TYPE_ICON_MAP: Record<string, LucideIcon> = {
  privacy: Shield,
  terms: Handshake,
  cookie: Cookie,
  refund: TicketX,
  shipping: Truck,
  "intellectual-property": NotebookPen,
  "data-protection": GlobeIcon,
  other: LayersIcon,
};
export const DOCUMENT_TYPE_LABEL_MAP: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  cookie: "Cookie Policy",
  refund: "Refund Policy",
  shipping: "Shipping Policy",
  "intellectual-property": "Intellectual Property",
  "data-protection": "Data Protection",
  other: "Other",
};
