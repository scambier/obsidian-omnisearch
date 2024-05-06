# Omnisearch for Obsidian

[![Sponsor me](https://img.shields.io/badge/%E2%9D%A4%20Like%20this%20plugin%3F-Sponsor%20me!-ff69b4)](https://github.com/sponsors/scambier)  
![Obsidian plugin](https://img.shields.io/endpoint?url=https%3A%2F%2Fscambier.xyz%2Fobsidian-endpoints%2Fomnisearch.json)
![GitHub release (latest by date and asset)](https://img.shields.io/github/downloads/scambier/obsidian-omnisearch/latest/main.js)  
![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch)
![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch?include_prereleases&label=BRAT%20beta)

> 🏆 Winner of the _[2023 Gems of the Year](https://obsidian.md/blog/2023-goty-winners/)_ in the "Existing plugin" category 🏆


---

**Omnisearch** is a search engine that "_just works_".  
It always instantly shows you the most relevant results, thanks to its smart weighting algorithm.

Under the hood, it uses the excellent [MiniSearch](https://github.com/lucaong/minisearch) library.

![](https://raw.githubusercontent.com/scambier/obsidian-omnisearch/master/images/omnisearch.gif)


## Documentation

https://publish.obsidian.md/omnisearch/Index

## Installation

- Omnisearch is available on [the official Community Plugins repository](https://obsidian.md/plugins?search=Omnisearch).
- Beta releases can be installed through [BRAT](https://github.com/TfTHacker/obsidian42-brat). **Be advised that those
  versions can be buggy and break things.**

You can check the [CHANGELOG](./CHANGELOG.md) for more information on the different versions.

## Features

> Omnisearch's first goal is to _locate_ files instantly. You can see it as a _Quick Switcher_ on steroids.

- Find your **📝notes, 📄PDFs, and 🖼images** faster than ever
  - Images and PDF indexing is available
    through [Text Extractor](https://github.com/scambier/obsidian-text-extractor)
- Automatic document scoring using
  the [BM25 algorithm](https://github.com/lucaong/minisearch/issues/129#issuecomment-1046257399)
  - The relevance of a document against a query depends on the number of times the query terms appear in the document,
    its filename, and its headings
- Keyboard first: you never have to use your mouse
- Workflow similar to the "Quick Switcher" core plugin
- Opt-in local HTTP server to query Omnisearch from outside of Obsidian
- Resistance to typos
- Switch between Vault and In-file search to quickly skim multiple results in a single note
- Supports `"expressions in quotes"` and `-exclusions`
- Filters file types with `.jpg` or `.md`
- Directly Insert a `[[link]]` from the search results
- Supports Vim navigation keys

**Note:** support of Chinese depends
on [this additional plugin](https://github.com/aidenlx/cm-chs-patch). Please read its documentation for more
information.

## Projects that use Omnisearch

_Submit a PR to add your own project!_

- [Omnisearch Companion](https://github.com/ALegendsTale/omnisearch-companion), an extension for your browser ([Firefox](https://addons.mozilla.org/en-US/firefox/addon/omnisearch-companion/), [Chrome](https://chromewebstore.google.com/detail/omnisearch-companion/kcjcnnlpfbilodfnnkpioijobpjhokkd))
- [Actions for Obsidian](https://actions.work/actions-for-obsidian)
- [Userscripts](https://publish.obsidian.md/omnisearch/Inject+Omnisearch+results+into+your+search+engine) to inject Omnisearch into your favorite web search engine

## LICENSE

Omnisearch is licensed under [GPL-3](https://tldrlegal.com/license/gnu-general-public-license-v3-(gpl-3)).

## Thanks

To all people who donate through [Ko-Fi](https://ko-fi.com/scambier)
or [Github Sponsors](https://github.com/sponsors/scambier) ❤

![JetBrains Logo (Main) logo](https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.svg)
