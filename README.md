# Omnisearch for Obsidian

[![Sponsor me](https://img.shields.io/badge/%E2%9D%A4%20Like%20this%20plugin%3F-Sponsor%20me!-ff69b4)](https://github.com/sponsors/scambier)  
![Obsidian plugin](https://img.shields.io/endpoint?url=https%3A%2F%2Fscambier.xyz%2Fobsidian-endpoints%2Fomnisearch.json)
![GitHub release (latest by date and asset)](https://img.shields.io/github/downloads/scambier/obsidian-omnisearch/latest/main.js)  
![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch)
![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch?include_prereleases&label=BRAT%20beta)

> **Omnisearch** is a search engine that "_just works_". It always instantly shows you the most relevant results, thanks to its smart weighting algorithm.

Under the hood, it uses the excellent [MiniSearch](https://github.com/lucaong/minisearch) library.

![](https://raw.githubusercontent.com/scambier/obsidian-omnisearch/master/images/omnisearch.gif)

## Features

> Omnisearch's first goal is to _locate_ files instantly. You can see it as a _Quick Switcher_ on steroids.

- Find your **📝notes, 📄PDFs, and 🖼images** faster than ever
    - _Images OCR and PDF indexing are only available on desktop_
- Automatic document scoring using the [BM25 algorithm](https://github.com/lucaong/minisearch/issues/129#issuecomment-1046257399)
  - The relevance of a document against a query depends on the number of times the query terms appear in the document, its filename, and its headings
- Keyboard first: you never have to use your mouse
- Workflow similar to the "Quick Switcher" core plugin
- Resistance to typos
- Switch between Vault and In-file search to quickly skim multiple results in a single note
- Supports `"expressions in quotes"` and `-exclusions`
- Directly Insert a `[[link]]` from the search results
- Supports Vim navigation keys

**Note:** support of Chinese, Japanese, Korean, etc. depends on [this additional plugin](https://github.com/aidenlx/cm-chs-patch). Please read its documentation for more information.

## Installation

- Omnisearch is available on [the official Community Plugins repository](https://obsidian.md/plugins?search=Omnisearch).
- Beta releases can be installed through [BRAT](https://github.com/TfTHacker/obsidian42-brat). **Be advised that those versions can be buggy and break things.**

You can check the [CHANGELOG](./CHANGELOG.md) for more information on the different versions.

## Usage

Omnisearch can be used within 2 different contexts:

### Vault Search

Omnisearch's core feature, accessible with the Command Palette "**_Omnisearch: Vault search_**". This modal searches through your vault and returns the most relevant notes. That's all you need to _find_ a note.

If you want to list all the search matches of a single note, you can do so by using `tab` to open the In-File Search.

### In-File Search 

Also accessible through the Command Palette "**_Omnisearch: In-file search_**". This modal searches through the active note's content and lists the matching results. Just press enter to automatically scroll to the right place.


## URL Scheme & Public API

You can open Omnisearch with the following scheme: `obsidian://omnisearch?query=foo bar`

----

For plugin developers and Dataview users, Omnisearch is also accessible through the global object `omnisearch` (`window.omnisearch`)

> This API is an experimental feature, the `ResultNote` interface may change in the future. The `search()` function returns at most 50 results.

```ts
// API:
{
  // Returns a promise that will contain the same results as the Vault modal
  search: (query: string) => Promise<ResultNoteApi[]>
}

type ResultNoteApi = {
  score: number
  path: string
  basename: string
  foundWords: string[]
  matches: SearchMatchApi[]
}

type SearchMatchApi = {
  match: string
  offset: number
}
```

### Dataview Integration

You can use the Omnisearch API directly within the [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) plugin.

~~~js
```dataviewjs
const results = await omnisearch.search('your query')
const arr = dv.array(results).sort(r => r.score, 'desc')
dv.table(['File', 'Score'], arr.map(o => [dv.fileLink(o.path), Math.round(o.score)]))
```
~~~

## CSS Customization

There are several CSS classes you can use to customize the appearance of Omnisearch.

```css
.omnisearch-modal
.omnisearch-result
.omnisearch-result__title
.omnisearch-result__counter
.omnisearch-result__body
.omnisearch-highlight
.omnisearch-input-container
.omnisearch-input-field
```

For example, if you'd like the usual yellow highlight on search matches, you can add this code inside a CSS snippet file:

```css
.omnisearch-highlight {
    color: var(--text-normal);
    background-color: var(--text-highlight-bg);
}
```

See [styles.css](./assets/styles.css) for more information.

## Issues & Solutions

**Omnisearch makes Obsidian sluggish at startup.**

- While Omnisearch does its best to work smoothly in the background, bigger vaults can cause some hiccups at startup because of the search index size.

**Omnisearch gives inconsistent/invalid results, there are errors in the developer console**

- Restart Obsidian to force a reindex of Omnisearch.
- The cache can be corrupted; you can clear it at the bottom of the settings page, then restart Obsidian.

**A query should return a result that does not appear.**

- If applicable, make sure that "*Ignore diacritics*" is enabled.
- If you have modified them, reset weightings to their original values.
- Rewrite your query and avoid numbers and common words.

**How do I highlight matches in search results?**

See [here](https://github.com/scambier/obsidian-omnisearch#css-customization).

**I'm still having an issue**

You can write your issue [here](https://github.com/scambier/obsidian-omnisearch/issues) with as much details as possible.


## LICENSE

Omnisearch is licensed under [GPL-3](https://tldrlegal.com/license/gnu-general-public-license-v3-(gpl-3)).

## Thanks

To all people who donate through [Ko-Fi](https://ko-fi.com/scambier) or [Github Sponsors](https://github.com/sponsors/scambier) ❤

![JetBrains Logo (Main) logo](https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.svg)
