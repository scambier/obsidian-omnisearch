# Omnisearch for Obsidian

[![Active Development](https://img.shields.io/badge/Maintenance%20Level-Actively%20Developed-brightgreen.svg)](https://gist.github.com/cheerfulstoic/d107229326a01ff0f333a1d3476e068d)


**Omnisearch** is a search engine that "_just works_". Type what you're looking for, and it will instantly show you the most relevant results.

Under the hood, it uses the excellent [MiniSearch](https://github.com/lucaong/minisearch) library.

![](https://raw.githubusercontent.com/scambier/obsidian-omnisearch/master/images/omnisearch.gif)

## Features

- Keyboard-centric, you never have to use your mouse
- Automatic document scoring using the [BM25 algorithm](https://github.com/lucaong/minisearch/issues/129#issuecomment-1046257399)
  - The relevance of a document against a query depends on the number of times the query terms appear in the document, its filename, and its headings
- Instant search results, with highlighting
- Fuzzy/partial search, resistance to typos
- In-file search to quickly skim multiple results in a single note

## Installation

[Omnisearch is available on the official Community Plugins repository](https://obsidian.md/plugins?search=omnisearch#).

You can also install it through [BRAT](https://github.com/TfTHacker/obsidian42-brat) for the future beta releases.

## Usage

There are 2 ways to use Omnisearch:

### Vault Search

Omnisearch's core feature, accessible with the Command Palette "_Omnisearch: Vault search_". This modal searches through your vault and returns the most relevant notes first. The notes that contain the query terms in their filename or headings are weighted higher than the others.

If you need to list all the matches of a single note, you can do so by using `alt+enter` to open the In-File Search.

### In-File Search

Also accessible through the command palette "_Omnisearch: In-file search_". This modal searches through the active note's content and lists the results.

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
