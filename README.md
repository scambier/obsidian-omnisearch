# Omnisearch for Obsidian

[![Sponsor me](https://img.shields.io/badge/%E2%9D%A4%20Like%20this%20plugin%3F-Sponsor%20me!-ff69b4)](https://github.com/sponsors/scambier)

![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch) ![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch?include_prereleases&label=BRAT%20beta) [![Active Development](https://img.shields.io/badge/Maintenance%20Level-Actively%20Developed-brightgreen.svg)](https://gist.github.com/cheerfulstoic/d107229326a01ff0f333a1d3476e068d)


**Omnisearch** is a search engine that "_just works_". It always instantly shows you the most relevant results, thanks to its smart weighting algorithm.

Under the hood, it uses the excellent [MiniSearch](https://github.com/lucaong/minisearch) library.

![](https://raw.githubusercontent.com/scambier/obsidian-omnisearch/master/images/omnisearch.gif)

## Features

- Automatic document scoring using the [BM25 algorithm](https://github.com/lucaong/minisearch/issues/129#issuecomment-1046257399)
  - The relevance of a document against a query depends on the number of times the query terms appear in the document, its filename, and its headings
- Keyboard first: you never have to use your mouse
- Instant & highlighted search results
- Resistance to typos
- In-file search to quickly skim multiple results in a single note
- Search filters: expressions in quotes and exclusions
- Respects Obsidian's "Excluded Files" list (results are downranked, not hidden)

## Installation

- Omnisearch is available on [the official Community Plugins repository](https://obsidian.md/plugins?search=Omnisearch).
- Beta releases can be installed through [BRAT](https://github.com/TfTHacker/obsidian42-brat). **Be advised that those versions can be buggy.**

You can check the [CHANGELOG](./CHANGELOG.md) for more information on the different versions.

## Usage

Omnisearch can be used within 2 different contexts:

### Vault Search

Omnisearch's core feature, accessible with the Command Palette "**_Omnisearch: Vault search_**". This modal searches through your vault and returns the most relevant notes. That's all you need to _find_ a note.

If you want to list all the search matches of a single note, you can do so by using `alt+enter` to open the In-File Search.

### In-File Search

Also accessible through the Command Palette "**_Omnisearch: In-file search_**". This modal searches through the active note's content and lists the matching results. Just press enter to automatically scroll to the right place.

## Customization

There are several CSS classes you can use to customize the appearance of Omnisearch.

```css
.omnisearch-modal
.omnisearch-result
.omnisearch-result__title
.omnisearch-result__counter
.omnisearch-result__body
.omnisearch-highlight
```

For example, if you'd like the usual yellow highlight on search matches, you can add this code inside a CSS snippet file:

```css
.omnisearch-highlight {
    color: var(--text-normal);
    background-color: var(--text-highlight-bg);
}
```


## LICENSE

Omnisearch is licensed under [GPL-3](https://tldrlegal.com/license/gnu-general-public-license-v3-(gpl-3)).
