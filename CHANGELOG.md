# Omnisearch Changelog

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
- Fixed a visual bog for Obsidian 0.15.3: https://github.com/scambier/obsidian-omnisearch/issues/76 

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
