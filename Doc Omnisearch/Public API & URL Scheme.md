
For technical users and plugins developers, Omnisearch exposes several utilities to integrate it into other plugins or 3rd party tools.

## URL Scheme

You can open Omnisearch and trigger a search with the following scheme: `obsidian://omnisearch?query=foo bar`. This will switch the focus to Obsidian, open Omnisearch, and execute the query "foo bar".
## Omnisearch API

Access it directly within Obsidian with the global `omnisearch` object.

```ts
// API:
type OmnisearchApi = {
  // Returns a promise that will contain the same results as the Vault modal
  search: (query: string) => Promise<ResultNoteApi[]>,
  // Refreshes the index
  refreshIndex: () => Promise<void>
  // Register a callback that will be called when the indexing is done
  registerOnIndexed: (callback: () => void) => void,
  // Unregister a callback that was previously registered
  unregisterOnIndexed: (callback: () => void) => void,
}

type ResultNoteApi = {
  score: number
  vault: string
  path: string
  basename: string
  foundWords: string[]
  matches: SearchMatchApi[]
  excerpt: string
}

type SearchMatchApi = {
  match: string
  offset: number
}
```

### Example: Dataview Integration

You can use the Omnisearch API directly within the [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) plugin.

~~~js
```dataviewjs
const results = await omnisearch.search('your query')
const arr = dv.array(results).sort(r => r.score, 'desc')
dv.table(['File', 'Score'], arr.map(o => [dv.fileLink(o.path), Math.round(o.score)]))
```
~~~

## HTTP Server API

For our most tech-savvy users, Omnisearch comes with a simple HTTP server. That makes it possible to query Omnisearch from 3rd-party applications running on your computer.

```
GET http://localhost:51361/search?q=your%20query
```

This will return a JSON array of `ResultNoteApi`, exactly like the "internal" API.

> [!Important]
> The HTTP Server must be activated in Omnisearch settings. It is not accessible outside of localhost. The server is automatically stopped when closing Obsidian.
> 
> This feature is not available on mobile.

**Usage example: [[Inject Omnisearch results into your search engine]]**


