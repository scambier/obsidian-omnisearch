# Omnisearch for Obsidian

[![Sponsor me](https://img.shields.io/badge/%E2%9D%A4%20Like%20this%20plugin%3F-Sponsor%20me!-ff69b4)](https://github.com/sponsors/scambier)  
![Obsidian plugin](https://img.shields.io/endpoint?url=https%3A%2F%2Fscambier.xyz%2Fobsidian-endpoints%2Fomnisearch.json)
![GitHub release (latest by date and asset)](https://img.shields.io/github/downloads/scambier/obsidian-omnisearch/latest/main.js)  
![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch)
![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/scambier/obsidian-omnisearch?include_prereleases&label=BRAT%20beta)

🏆 _Winner of the _[2023 Gems of the Year](https://obsidian.md/blog/2023-goty-winners/)_ in the "Existing plugin" category_ 🏆


---

**Omnisearch** is a search engine that "_just works_".  
It always instantly shows you the most relevant results, thanks to its smart weighting algorithm.

Under the hood, it uses the excellent [MiniSearch](https://github.com/lucaong/minisearch) library. This free plugin is totally unrelated to the omnisearch.ai paid product.

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

- Find your **📝notes, 📄Office documents, 📄PDFs, and 🖼images** faster than ever
  - Images, documents, and PDF indexing is available
    through [Text Extractor](https://github.com/scambier/obsidian-text-extractor)
- Automatic document scoring using
  the [BM25 algorithm](https://github.com/lucaong/minisearch/issues/129#issuecomment-1046257399)
  - The relevance of a document against a query depends on the number of times the query terms appear in the document,
    its filename, and its headings
- Keyboard first: you never have to use your mouse
- Fully customizable keyboard shortcuts for the search menu
- Workflow similar to the "Quick Switcher" core plugin
- Opt-in local HTTP server to query Omnisearch from outside of Obsidian
- Resistance to typos
- Switch between Vault and In-file search to quickly skim multiple results in a single note
- Supports `"expressions in quotes"` and `-exclusions`
- Filters file types with `.jpg` or `.md`
- Directly Insert a `[[link]]` from the search results
- Supports Vim navigation keys

**Note:** support of Chinese depends
on [this additional plugin](https://github.com/aidenlx/cm-chs-patch) (also you may need to clear search cache data to apply new Chinese index). Please read its documentation for more
information.

## Projects that use Omnisearch

_Submit a PR to add your own project!_

- [Omnisearch Companion](https://github.com/ALegendsTale/omnisearch-companion), an extension for your browser ([Firefox](https://addons.mozilla.org/en-US/firefox/addon/omnisearch-companion/), [Chrome](https://chromewebstore.google.com/detail/omnisearch-companion/kcjcnnlpfbilodfnnkpioijobpjhokkd))
- [Actions for Obsidian](https://actions.work/actions-for-obsidian)
- [Notebook Navigator](https://notebooknavigator.com/)
- [Userscripts](https://publish.obsidian.md/omnisearch/Inject+Omnisearch+results+into+your+search+engine) to inject Omnisearch into your favorite web search engine
- [obsidian-mcp-server](https://github.com/cyanheads/obsidian-mcp-server), an MCP server that auto-detects Omnisearch and exposes it as a BM25-ranked search mode for AI agents accessing your vault
- [Silversearch](https://github.com/MrMugame/silversearch) is a fork of Omnisearch for [Silverbullet](https://silverbullet.md/).

## Settings

### Keyboard shortcuts

Every shortcut used while the search menu is open can be rebound in **Settings → Omnisearch → Keyboard shortcuts**. The editor mirrors Obsidian's own Hotkeys UI: click `+` to record a new combination, click an existing shortcut to replace it, click `×` to remove it, and press Esc to cancel. A "Reset to defaults" button restores the original keybindings.

While the search menu is open, Omnisearch's shortcuts take priority over Obsidian's and other plugins' hotkeys for the same keys.

The shortcuts are stored in the `shortcuts` setting, a map of shortcut id to hotkey list. The defaults are:

| Shortcut | Default key |
| --- | --- |
| Open result in current pane | Enter |
| Open result in new pane | Mod + Enter |
| Open result in new split | Mod + Alt + Enter |
| Open result in background | Mod + O |
| Create note | Shift + Enter |
| Create note in new pane | Mod + Shift + Enter |
| Insert link to result | Alt + Enter |
| Switch context (vault / in-file search) | Tab |
| Toggle excerpts | Mod + G |
| Previous search history | Alt + ArrowUp |
| Next search history | Alt + ArrowDown |
| Navigate up | ArrowUp |
| Navigate down | ArrowDown |
| Navigate up (Vim style) | Mod + K, Mod + P |
| Navigate down (Vim style) | Mod + J, Mod + N |

`Mod` is Ctrl on Windows/Linux and Cmd on macOS. The Vim-style navigation shortcuts only apply when "Set Vim like navigation keys" is enabled.

Middle-clicking a result opens it in the background and keeps the search menu open.

## LICENSE

Omnisearch is licensed under [GPL-3](https://tldrlegal.com/license/gnu-general-public-license-v3-(gpl-3)).

## Thanks

To all people who donate through [Ko-Fi](https://ko-fi.com/scambier)
or [Github Sponsors](https://github.com/sponsors/scambier) ❤
