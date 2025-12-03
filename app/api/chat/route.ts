import { POST as CommandPOST } from "../ai/command/route";

export const runtime = "edge";

export async function POST(req: Request) {
  return CommandPOST(req);
}
