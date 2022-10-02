# Omnisearch Changelog

## 1.6.x

### New

- Omnisearch can now index other plaintext files and PDFs https://github.com/scambier/obsidian-omnisearch/issues/58
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
