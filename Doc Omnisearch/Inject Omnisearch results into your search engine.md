It is possible to get Omnisearch results into your favorite Internet search engine, to increase discoverability of your notes.

## How-to

1. Install the latest version of [Omnisearch](https://obsidian.md/plugins?search=Omnisearch)
2. Enable the HTTP server in Omnisearch settings ![[Pasted image 20231015195107.png]]
3. Install [Tampermonkey](https://www.tampermonkey.net/) (or another userscript manager) for your browser
4. Install the userscript corresponding to your favorite search engine:
	- [Kagi](https://github.com/scambier/userscripts/raw/master/dist/obsidian-omnisearch-kagi.user.js)
	- [Google](https://github.com/scambier/userscripts/raw/master/dist/obsidian-omnisearch-google.user.js)
	- [DuckDuckGo](https://github.com/scambier/userscripts/raw/master/dist/obsidian-omnisearch-ddg.user.js)
	- [Bing](https://github.com/scambier/userscripts/raw/master/dist/obsidian-omnisearch-bing.user.js)

> [!question] Userscripts
> [Userscripts](https://en.wikipedia.org/wiki/Userscript) are "micro plugins" for your browser, they're small hackable JavaScript programs intended to modify the appearance or behavior of some sites.

> [!info] HTTP Server
> More info on Omnisearch's HTTP server [[Public API & URL Scheme#HTTP Server API|here]].

## Demos

![[Pasted image 20231015190539.png]]
<small>Omnisearch results injected in Google</small>

![[Pasted image 20231016173131.png]]
<small>Omnisearch results injected in Kagi</small>
