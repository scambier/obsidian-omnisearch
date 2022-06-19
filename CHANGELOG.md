# Omnisearch Changelog

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
