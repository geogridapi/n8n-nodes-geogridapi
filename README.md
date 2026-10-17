# n8n-nodes-geogridapi

The official [GeoGridAPI](https://geogridapi.io) node for [n8n](https://n8n.io/). Track where a Google Business Profile ranks on Google Maps, point by point, around the business: run a geo-grid for a listing and a keyword, then get the rank at every point, the competitors ranking ahead, the trend over time and a ready-to-share PNG heatmap.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

**Self-hosted n8n**: Settings → Community Nodes → Install, then enter `n8n-nodes-geogridapi`. See the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

1. Create an account on [geogridapi.io](https://geogridapi.io) (500 free credits).
2. In the console, create an API key. A `gga_live_` key measures real grids and spends your credits (1 credit = 1 grid point). A `gga_test_` key returns free sample grids, handy to build a workflow.
3. In n8n, create a **GeoGridAPI API** credential and paste the key. n8n tests it against `GET /v1/balance`.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| Grid | Run | Measures a listing for a keyword on a grid (square 3×3 to 9×9, or circle, diamond, hexagon, cross, ellipse, rectangle). By default the node waits for the result (up to 5 minutes, adjustable). |
| Grid | Estimate | Exact number of points and credits before running a grid. Free. |
| Grid | Get | A grid with its rank matrix, summary, competitors ahead and change since the previous grid. |
| Grid | Get Many | Past grids, newest first, filtered by place ID or keyword. |
| Grid | Get Image | The PNG heatmap of a completed grid, as binary data (for an email, Slack or a client report). |
| Grid | Get History | The ranking trend of the same map (listing, keyword, format) over time. Free. |
| Listing | Search | Finds a Google Business Profile by name and city, with its place ID. Free. |
| Batch | Run | Up to 50 grids with the same format in one call: one listing with several keywords, or several listings with one keyword. |
| Batch | Get | A batch and the status of each of its grids. |
| Schedule | Create, Get Many, Update, Delete | Repeats a grid every week or every month, pauses, resumes or stops it. |
| Account | Get Balance | The credits balance. |

With **Simplify** on (default), Grid → Run and Grid → Get leave out the detail of each point (coordinates and top 3 listings) and keep the rank matrix, summary and competitors.

## Usage

**Weekly rank report in Google Sheets**: Schedule Trigger (every Monday) → GeoGridAPI *Grid → Run* (your listing and keyword, Wait for Completion on) → Google Sheets *Append Row* with `summary.average_rank`, `summary.top3_points` and `previous.changes.average_rank`.

**Client report by email**: GeoGridAPI *Grid → Run* → GeoGridAPI *Grid → Get Image* (Grid ID: `{{ $json.id }}`) → Gmail *Send* with the binary `data` as attachment.

**Without waiting**: turn Wait for Completion off and put the URL of an n8n Webhook node in *Additional Fields → Webhook URL*: the finished grid is posted there (`grid.completed` or `grid.failed`).

Ranks are positions in the Google Maps results at each grid point: lower is better, `null` means not in the top 20. A grid takes 20 seconds to 2 minutes. A failed grid is refunded automatically.

## Compatibility

Built with `@n8n/node-cli` 0.52 (n8n nodes API version 1). No runtime dependencies.

## Resources

- [GeoGridAPI documentation](https://geogridapi.io/en/docs)
- [No-code guide (n8n, Make, Zapier)](https://geogridapi.io/en/docs/no-code)
- [OpenAPI specification](https://geogridapi.io/openapi.json)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
