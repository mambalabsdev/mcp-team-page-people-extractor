# Team Page People Extractor MCP Server

[![Smithery](https://smithery.ai/badge/mambabuilt/mcp-team-page-people-extractor)](https://smithery.ai/servers/mambabuilt/mcp-team-page-people-extractor) [![Glama score](https://glama.ai/mcp/servers/mambalabsdev/mcp-team-page-people-extractor/badges/score.svg)](https://glama.ai/mcp/servers/mambalabsdev/mcp-team-page-people-extractor) [![MCP Registry](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%3Fsearch%3Dcom.mambabuilt%252Fmcp-team-page-people-extractor%26limit%3D1&query=%24.servers%5B0%5D._meta%5B%22io.modelcontextprotocol.registry%2Fofficial%22%5D.status&label=mcp%20registry&color=blue)](https://registry.modelcontextprotocol.io/v0/servers?search=com.mambabuilt/mcp-team-page-people-extractor&limit=1) [![npm version](https://img.shields.io/npm/v/@mambalabsdev/mcp-team-page-people-extractor)](https://www.npmjs.com/package/@mambalabsdev/mcp-team-page-people-extractor) [![npm downloads](https://img.shields.io/npm/dm/@mambalabsdev/mcp-team-page-people-extractor)](https://www.npmjs.com/package/@mambalabsdev/mcp-team-page-people-extractor) [![license](https://img.shields.io/github/license/mambalabsdev/mcp-team-page-people-extractor)](https://github.com/mambalabsdev/mcp-team-page-people-extractor/blob/main/LICENSE) [![mcpservers.org](https://img.shields.io/badge/mcpservers.org-listed-blue)](https://mcpservers.org/servers/mambalabsdev/mcp-team-page-people-extractor)

MCP server for the Mamba Labs [Team Page People Extractor](https://apify.com/mambalabs/team-page-people-extractor) actor on Apify.

Give it a company domain and it returns the people that company publishes on its own team, leadership or about page: names, titles, and the page each one came from. Nothing here reads LinkedIn or any other profile network.

## Install

```bash
npx -y @mambalabsdev/mcp-team-page-people-extractor
```

### Claude Desktop

```json
{
  "mcpServers": {
    "mamba-team-page-people-extractor": {
      "command": "npx",
      "args": ["-y", "@mambalabsdev/mcp-team-page-people-extractor"],
      "env": { "APIFY_TOKEN": "your-apify-token" }
    }
  }
}
```

Get an Apify token at [console.apify.com/account/integrations](https://console.apify.com/account/integrations).

## Tool

### `extract_team_page_people`

Give it a company domain and it returns the people that company publishes on its own team, leadership or about page: names, titles, and the page each one came from. Nothing here reads LinkedIn or any other profile network.

| Input | Type | Required | Notes |
| --- | --- | --- | --- |
| `domain` | string | yes | A single company domain, for example swishdata.com. Protocol and path are stripped. |
| `output_grain` | enum | no | person returns one row per person, which is the default and what most Clay tables want. company returns one row per company with a people_json array plus the first five names and titles flattened into columns. |
| `seniority_filter` | enum | no | all keeps everyone the page published. executive keeps founders and C-level only. leadership adds VPs, directors and heads. |
| `max_people` | string | no | Sent as a string so Clay can map a column into it. Clamped to 1 to 200. People are ordered by seniority before the cap applies, and anything dropped is logged with the count. |
| `include_emails` | boolean | no | Off by default and you should probably leave it off. Across three domains that published an email on a team page we found one role mailbox, one placeholder in example content, and one literal user@domain.com template string. Not one was a real person's address. When on, emails come back on the COMPANY row only, never attached to a named person, because nothing on these pages proves which address belongs to whom. |
| `skipCache` | enum | no | false uses the 14 day result cache. true re-crawls the company from scratch. |

## Billing

You are charged per person found, plus a small actor start fee. A company that publishes nobody costs only the start fee.

Pricing is on the [actor's Apify page](https://apify.com/mambalabs/team-page-people-extractor). Running this server consumes Apify credits.

## What this server does and does not do

It is a thin client for the Apify actor. It passes your input through and returns the actor's output unchanged. Every behavior described above lives in the actor, not here.

Errors are surfaced, never swallowed. An invalid input, an invalid token, an exhausted balance, a timeout, or a run that returns anything other than a dataset all come back as an explicit tool error rather than as an empty result.

## Source

The actor is on the [Apify Store]( https://apify.com/mambalabs/team-page-people-extractor). This wrapper is [MIT licensed](LICENSE).

Built by [Mamba Labs](https://apify.com/mambalabs)
