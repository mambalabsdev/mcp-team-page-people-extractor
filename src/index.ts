#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(here, "..", "package.json"), "utf8"),
) as { version: string; name: string };

// Distinctive UA so Apify run meta.userAgent marks MCP-originated runs.
const USER_AGENT = `mambalabs-mcp ${pkg.name}@${pkg.version}`;

type ToolResult = {
  isError?: boolean;
  content: Array<{ type: "text"; text: string }>;
};

// Drop undefined values so optional inputs are not sent to the actor.
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// Shared caller. actorPath is the actor's immutable Apify actor ID (a stable key
// that survives Store renames). The /v2/acts/{id} endpoint accepts it directly,
// so a Store rename never breaks these calls.
//
// The token is read here rather than at module load, so the tool registers
// unconditionally and a server started without APIFY_TOKEN still advertises its
// capabilities instead of reporting none.
async function runActor(
  actorPath: string,
  actorLabel: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    return { isError: true, content: [{ type: "text", text: "APIFY_TOKEN is not set. Create a token at https://console.apify.com/account/integrations and set it as the APIFY_TOKEN environment variable." }] };
  }

  const url = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?timeout=300`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APIFY_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(input),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `Could not reach the Apify API: ${message}` }] };
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) detail = ` ${body.error.message}`;
    } catch {
      detail = "";
    }

    let message: string;
    switch (response.status) {
      case 400:
        message = `The ${actorLabel} run was rejected as invalid input.${detail}`;
        break;
      case 401:
        message = "Invalid Apify token. Check your APIFY_TOKEN environment variable.";
        break;
      case 402:
        message =
          "Insufficient Apify credits. Check your account balance at https://console.apify.com/billing";
        break;
      case 408:
        message = `The ${actorLabel} run timed out after 300 seconds. Ask for less per call, or run the actor on Apify directly for larger jobs.`;
        break;
      default:
        message = `Apify request to ${actorLabel} failed with status ${response.status}.${detail}`;
    }
    return { isError: true, content: [{ type: "text", text: message }] };
  }

  // A 2xx from run-sync-get-dataset-items normally carries the dataset array.
  // Anything else on this path is a failure the caller must see, never an empty
  // success: surfacing it here is what keeps a failed run from reading as "no
  // results found".
  let items: unknown;
  try {
    items = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run returned a response that could not be parsed: ${message}` }] };
  }

  if (!Array.isArray(items)) {
    const asObj = items as { error?: { type?: string; message?: string } };
    const detail = asObj?.error?.message
      ? `${asObj.error.message}`
      : JSON.stringify(items);
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run did not return a dataset. ${detail}` }] };
  }

  return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
}

const server = new McpServer({
  name: "mamba-team-page-people-extractor",
  version: pkg.version,
});

// Team Page People Extractor (immutable actor ID j8a9zX0k4mNbvDbWK)
server.registerTool(
  "extract_team_page_people",
  {
    title: "Extract Team Page People",
    description:
      "Extract the people a company publishes on its own team, leadership or about page, and return their names, titles and the page each one came from. It also reports which pages it actually reached, so an empty result tells you whether the company publishes nobody or whether the site could not be read, which are very different answers. output_grain person returns one row per person and is what most tables want; output_grain company returns one row per company with a people_json array plus the first five names and titles flattened into columns. seniority_filter narrows to founders and C level, or adds VPs, directors and heads. People are ordered by seniority before max_people applies, and anything dropped is logged with a count. include_emails is off by default and should usually stay off: across the domains tested, the addresses published on team pages were role mailboxes, placeholders and literal template strings rather than real people, so when it is on the emails come back on the company row only and are never attached to a named person. Results are cached for 14 days. Nothing here scrapes LinkedIn or any profile network; it reads only what the company published itself. Requires an APIFY_TOKEN and consumes Apify credits. Read only.",
    annotations: {
      title: "Extract Team Page People",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
    domain: z.string().describe("A single company domain, for example swishdata.com. Protocol and path are stripped."),
    output_grain: z.enum(["person", "company"]).optional().describe("person returns one row per person, which is the default and what most Clay tables want. company returns one row per company with a people_json array plus the first five names and titles flattened into columns. Default: \"person\"."),
    seniority_filter: z.enum(["all", "executive", "leadership"]).optional().describe("all keeps everyone the page published. executive keeps founders and C-level only. leadership adds VPs, directors and heads. Default: \"all\"."),
    max_people: z.string().optional().describe("Sent as a string so Clay can map a column into it. Clamped to 1 to 200. People are ordered by seniority before the cap applies, and anything dropped is logged with the count. Default: \"50\"."),
    include_emails: z.boolean().optional().describe("Off by default and you should probably leave it off. Across three domains that published an email on a team page we found one role mailbox, one placeholder in example content, and one literal user@domain.com template string. Not one was a real person's address. When on, emails come back on the COMPANY row only, never attached to a named person, because nothing on these pages proves which address belongs to whom. Default: false."),
    skipCache: z.enum(["false", "true"]).optional().describe("false uses the 14 day result cache. true re-crawls the company from scratch. Default: \"false\"."),
    },
  },
  async (args) =>
    runActor("j8a9zX0k4mNbvDbWK", "Team Page People Extractor", compact(args as Record<string, unknown>)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
