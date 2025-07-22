# Omnisearch Changelog

This changelog is not exhaustive.

## 1.27.x

- Updated Svelte from v3 to v5
- Highlighting improvements
- Bug fixes

## 1.26.x

- Allow `# headings` as display titles in search results
- Added an experimental recency boost
- Added lazy loading for the vault modal items

## 1.25.x

- Added basic support for embed references in Vault Search results
- Added support for [Iconize](https://github.com/FlorianWoelki/obsidian-iconize)
- Weights are now 1-10 (instead of 1-5)
- Small performance improvements

## 1.24.x

- Added support for [AI Image Analyzer](https://github.com/Swaggeroo/obsidian-ai-image-analyzer)

## 1.23.x

- Updated Chinese tokenizer
- Added user-defined boosted fields
- No more freezes when loading large caches (hopefully)
- Large refactoring to properly clean up several older warnings

## 1.22.x

- Improved highlighting

## 1.21.x

- Added support for .docx and .xlsx

## 1.20.x

- Refactored indexing tokenization process to correctly take diacritics into account
- Added highlighting in the note's path
- Improved the selection of the chosen excerpt in the results list

## 1.19.x

- Various bugfixes and improvements

## 1.18.x

- Added a localhost server to use Omnisearch's API from outside Obsidian

## 1.17.x

- Added a shortcut to open files without closing Omnisearch
- Prefill the search field with selected text
- Improved highlighting

## 1.16.x

- Various indexing/tokenization improvements

## 1.15.x

- Added support of webp images
- Configurable fuzziness
- Added support for DataLoom plugin files
- Unsupported files are now indexed by their path
- Unmarked tags are now slightly boosted

## 1.14.x

- Added a `path:` option
- Bugfixes

## 1.13.x

- CamelCaseWords are now indexed as 3 words
- Reduced search freezes in some cases

## 1.12.x

- You can filter files by their extension
- Refreshed UI
- New API functions
- Fixed some tokenization issues

## 1.10.x - 1.11.x

- Added support for Text Extractor; Omnisearch no longer extracts text itself
- Added canvas indexing
- Improved tags indexing

## 1.9.x

- PDFs are no longer indexed on mobile 
- Performance improvements
- Various bugfixes

## 1.8.x

- Added OCR for images
- OCR and PDF indexing are now restricted to desktop. They either don't work or consume too much resources during indexing of big vaults. Too many headaches.
- Notes caching is deactivated on iOS because of crashes: memory usage too high during (de)serializing.
- Added an URL scheme for integration with external tools: `obsidian://omnisearch?query=foo bar`

## 1.7.x

### New

- PDF Indexing https://github.com/scambier/obsidian-omnisearch/issues/58

### Improved

- Code refactor to better scale and handle PDFs as smoothly as possible

### Fixed

- Search history https://github.com/scambier/obsidian-omnisearch/issues/104
- Text in search input was not always correctly selected https://github.com/scambier/obsidian-omnisearch/issues/105
- Padding issue https://github.com/scambier/obsidian-omnisearch/issues/113

### Removed

- Caching data https://github.com/scambier/obsidian-omnisearch/issues/92#issuecomment-1287647725


## 1.6.x

### New

- Omnisearch can now index other plaintext files ~~and PDFs~~ https://github.com/scambier/obsidian-omnisearch/issues/58
- Search history, navigable with <code>alt+up/down</code> https://github.com/scambier/obsidian-omnisearch/issues/90 
- Added a setting to toggle the visibility of the note excerpt in results https://github.com/scambier/obsidian-omnisearch/issues/70

### Improved

- You can now create a new note in a new pane https://github.com/scambier/obsidian-omnisearch/issues/87
- Added a setting to show a "create note" button https://github.com/scambier/obsidian-omnisearch/issues/96

### Fixed

- Fixed layout issues https://github.com/scambier/obsidian-omnisearch/issues/97

## 1.5.x

### New

* Added a toggleable sidebar button to open Omnisearch: https://github.com/scambier/obsidian-omnisearch/issues/60
* Added a cache-clearing mechanism in case of corruption: https://github.com/scambier/obsidian-omnisearch/issues/83

### Improved

* Notes created by Omnisearch now honour the default note location https://github.com/scambier/obsidian-omnisearch/pull/81
* Ctrl+click now opens the note in a new pane https://github.com/scambier/obsidian-omnisearch/issues/61
* Improved highlighting https://github.com/scambier/obsidian-omnisearch/issues/85

### Fixed

* Fixed some edge cases when opening an already open/pinned note https://github.com/scambier/obsidian-omnisearch/issues/51 https://github.com/scambier/obsidian-omnisearch/issues/80
* Fixed nested tags searching https://github.com/scambier/obsidian-omnisearch/issues/79
* Fixed a silent crash when clicking on In-File search results https://github.com/scambier/obsidian-omnisearch/issues/84

## 1.4.x

### New

- Opt-in support for Vim navigation keys: https://github.com/scambier/obsidian-omnisearch/issues/26
- Opt-in display of "short form" links: https://github.com/scambier/obsidian-omnisearch/issues/59
- Opt-in search index serialization, for faster loading times: https://github.com/scambier/obsidian-omnisearch/pull/64 by @mnaoumov
- Opt-out: diacritics can now be ignored
- Added support for `#tag` searches: https://github.com/scambier/obsidian-omnisearch/issues/48
- Added a basic public API for integration with other plugins: https://github.com/scambier/obsidian-omnisearch/issues/22 https://github.com/scambier/obsidian-omnisearch/issues/69
- Use `alt+enter` to inject a link to the currently selected search result item: https://github.com/scambier/obsidian-omnisearch/issues/32


### Improved

- You can now switch between "Vault" and "In-File" modals with `tab`
- Search index updates are now done only when Omnisearch is invoked: https://github.com/scambier/obsidian-omnisearch/issues/57
- New files are now created empty: https://github.com/scambier/obsidian-omnisearch/issues/77

### Fixed

- Opening a pinned note would open it a second time: https://github.com/scambier/obsidian-omnisearch/issues/51
- Fixed an issue that would index "non-existing notes" multiple times: https://github.com/scambier/obsidian-omnisearch/issues/68
- Fixed a visual bug for Obsidian 0.15.3: https://github.com/scambier/obsidian-omnisearch/issues/76 
- Fixed the diacritics normalization of the note's title: https://github.com/scambier/obsidian-omnisearch/issues/72

## 1.3.x

### New

* Chinese support by @aidenlx in https://github.com/scambier/obsidian-omnisearch/pull/37
  * You need to install https://github.com/aidenlx/cm-chs-patch to enable this feature
* Settings page https://github.com/scambier/obsidian-omnisearch/issues/41
* Do not show indexing Notice by default by @chrisgrieser in https://github.com/scambier/obsidian-omnisearch/pull/46
* Include notes that don't exist https://github.com/scambier/obsidian-omnisearch/issues/14

### Improved

* Better accessibility https://github.com/scambier/obsidian-omnisearch/issues/50
* Note aliases are now scored as high as the filename in search results https://github.com/scambier/obsidian-omnisearch/issues/34
* By default, reindexing is now done when the app is out of focus, and not after each save https://github.com/scambier/obsidian-omnisearch/issues/57
  * On mobile, indexing is only done at startup

### Fixed

* Showing an error when a note can't be created https://github.com/scambier/obsidian-omnisearch/issues/52


## 1.2.x

### New
* #42 Files that are present in Obsidian's "Excluded Files" list are downranked by a factor of 3 (_desktop only_)

## 1.1.1

### Fixes
* Fixed a crash when no results were returned

## 1.1.0

### New
* #25 Search filters: expressions in quotes and exclusions
* Added support for beta versions with [BRAT](https://github.com/TfTHacker/obsidian42-brat)

This works as a "post-search" filter and does not allow for partial words searches (see #35)

### Fixes
* #39 Fixed key events not correctly prevented in the search input

**Full Changelog**: https://github.com/scambier/obsidian-omnisearch/compare/1.0.1...1.1.0

## 1.0.1

## 1.0.0

* First non-beta release
* Includes Vault search and In-File search
