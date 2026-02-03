import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const key = process.env.CANVAS_ADMIN_KEY;
if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL missing");
if (!key) throw new Error("CANVAS_ADMIN_KEY missing");

const client = new ConvexHttpClient(url);

async function main() {
  const res = await client.mutation(api.canvas.clearCanvas, { adminKey: key as string });
  console.log(res);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
