Despite our best efforts, we unfortunately can't totally prevent bugs and performance issues. Those few tips should hopefully help you fix Omnisearch.

**Omnisearch makes Obsidian sluggish/freeze at startup.**

- While Omnisearch does its best to work smoothly in the background, bigger vaults and files can make Obsidian stutter during indexing.
- If you have several thousands of files, Obsidian may freeze a few seconds at startup while its cache is loaded in memory.
- To avoid boot loop crashes, Omnisearch will automatically disable its cache if there is an issue at startup.

**Omnisearch crashes on Android/iOS.**

- If you have many notes, Omnisearch can consume more RAM than what is available on your device. This can cause hard crashes, and there is no solution other than to disable Omnisearch.
- iOS devices are more prone to crashes when loading the cache. For this reason, caching is disabled on iOS.

**Omnisearch seems to make Obsidian slower.**

- Once Obsidian has indexed your files at startup, it doesn't do any background work while its modal is closed. Your changes are not indexed until you open the modal again. If you experience slowdowns while using Obsidian, it's unlikely that Omnisearch is responsible.
- However, Text Extractor can make Obsidian slower while indexing PDFs and images for the first time. If you don't need those features, you can disable them in the plugin settings.

**Omnisearch is slow to index my PDFs and images**

- The first time Text Extractor reads those files, it can take a long time to extract their text. The results are then cached for the text startup.

**Omnisearch gives inconsistent/invalid results, there are errors in the developer console**

- Restart Obsidian to force a reindex of Omnisearch.
- The cache could be corrupted; you can clear it at the bottom of the settings page, then restart Obsidian.

**A query should return a result that does not appear.**

- If applicable, make sure that "*Ignore diacritics*" is enabled.
- If you have modified them, reset weightings to their original values.
- Rewrite your query and avoid numbers and common words.

**I'm still having an issue**

You can write your issue [here](https://github.com/scambier/obsidian-omnisearch/issues) with as much details as possible.
