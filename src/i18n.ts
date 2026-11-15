import { getLanguage } from 'obsidian'

const data = {
  '⚠️ OMNISEARCH IS DISABLED ⚠️': '⚠️ OMNISEARCH 已禁用 ⚠️',
  'You have installed': '你已安装',
  'Omnisearch can use it to index PDFs and images contents.':
    'Omnisearch 可用它索引 PDF 和图像内容。',
  'Text extraction only works on desktop, but the cache can be synchronized with your mobile device.':
    '文本提取仅在桌面端可用，但缓存可以同步到移动设备。',
  "requires": '需要',
  'to index PDFs and images.': '才能索引 PDF 和图像。',
  'Omnisearch can use it to index images contents with AI.':
    'Omnisearch 可用它通过 AI 索引图像内容。',
  'to index images with AI.': '才能使用 AI 索引图像。',
  'Sponsor scambier': '赞助 scambier',
  'Buy Me a Coffee at ko-fi.com': '在 ko-fi.com 请我喝咖啡',
  "Debugging": '调试',
  'Enable verbose logging': '启用详细日志',
  'Adds a LOT of logs for debugging purposes. You also need to enable "Verbose" logging in the console to see these logs.':
    '为调试记录大量日志。还需要在控制台中启用“Verbose”日志级别才能看到这些日志。',

  "Indexing": '索引',
  'PDFs content indexing': 'PDF 内容索引',
  'Images OCR indexing': '图像 OCR 索引',
  'Documents content indexing': '文档内容索引',
  'Images AI indexing': '图像 AI 索引',
  '⚠️ Disabled': '⚠️ 已禁用',
  'Index paths of unsupported files': '索引不受支持文件的路径',
  'Set frontmatter property key as title': '使用 frontmatter 属性作为标题',
  'Additional TEXT files to index': '其他要索引的 TEXT 文件',
  'Example: txt org csv': '示例：txt org csv',
  'Index files without extension': '索引没有扩展名的文件',
  "default": '默认',
  "Yes": '是',
  "No": '否',
  'Obsidian setting': 'Obsidian 设置',

  'Omnisearch will use Text Extractor to index the content of your PDFs.':
    'Omnisearch 将使用 Text Extractor 索引 PDF 内容。',
  'Omnisearch will use Text Extractor to OCR your images and index their content.':
    'Omnisearch 将使用 Text Extractor 对图像进行 OCR 并索引其内容。',
  'Omnisearch will use AI Image Analyzer to index the content of your images with AI.':
    'Omnisearch 将使用 AI Image Analyzer 通过 AI 索引图像内容。',
  '⚠️ Changing indexing settings will clear the cache, and requires a restart of Obsidian.':
    '⚠️ 更改索引设置会清空缓存，并且需要重启 Obsidian。',
  'You can set custom weights for values of header properties (e.g. "keywords"). Weights under 1.0 will downrank the results.':
    '可为标题属性（例如“keywords”）的值设置自定义权重。低于 1.0 的权重会降低结果排名。',
  'Files that have been modified more recently than [selected cutoff] are given a higher rank.':
    '修改时间比所选时限更近的文件会获得更高排名。',

  "Behavior": '行为',
  'Save index to cache': '将索引保存到缓存',
  'Enable caching to speed up indexing time. In rare cases, the cache write may cause a crash in Obsidian. This option will disable itself if it happens.':
    '启用缓存以加快索引速度。极少数情况下，写入缓存可能导致 Obsidian 崩溃；如发生此情况，此选项会自动关闭。',
  'Show previous query results': '显示上次查询结果',
  'Re-executes the previous query when opening Omnisearch.':
    '打开 Omnisearch 时重新执行上次查询。',
  'Scroll to the matched text when opening a note': '打开笔记时滚动到匹配文本',
  'When a note is opened from the vault search, place the cursor on the first match. Disable this to open the note without moving the cursor.':
    '从库搜索打开笔记时，将光标放在第一个匹配项。关闭后打开笔记时不会移动光标。',
  'Respect Obsidian\'s "Excluded Files"': '遵循 Obsidian 的“排除文件”',
  'By default, files that are in Obsidian\'s "Options > Files & Links > Excluded Files" list are downranked in results.\n        Enable this option to completely hide them.':
    '默认情况下，Obsidian“设置 > 文件与链接 > 排除文件”列表中的文件会在结果中降权。启用此选项可完全隐藏它们。',
  'Folders to downrank in search results': '在搜索结果中降权的文件夹',
  'Folders to downrank in search results. Files in these folders will be downranked in results.  They will still be indexed for tags, unlike excluded files.  Folders should be comma delimited.':
    '在搜索结果中降权的文件夹。这些文件夹中的文件会在结果中降权。与排除文件不同，它们仍会被索引以支持标签搜索。文件夹之间用逗号分隔。',
  'Example: src,p2/dir': '示例：src,p2/dir',
  'Split CamelCaseWords': '拆分 CamelCaseWords',
  'Enable this if you want to be able to search for CamelCaseWords as separate words.':
    '启用后可将 CamelCaseWords 作为独立单词搜索。',
  '⚠️ Changing this setting will clear the cache.': '⚠️ 更改此设置会清空缓存。',
  'Simpler search': '简化搜索',
  "Enable this if Obsidian often freezes while making searches.\n        Words shorter than 3 characters won't be used as prefixes; this can reduce search delay but will return fewer results.":
    '如果搜索时 Obsidian 经常卡死，可启用此项。长度不足 3 个字符的单词不会作为前缀；这可缩短搜索延迟，但结果会更少。',
  'Tokenize URLs': '将 URL 分词',
  'Enable this if you want to be able to search for URLs as separate words.\n        This setting has a strong impact on indexing performance, and can crash Obsidian under certain conditions.':
    '启用后可将 URL 作为独立单词搜索。此设置会严重影响索引性能，并可能在某些情况下导致 Obsidian 崩溃。',
  'Set Vim like navigation keys': '设置类 Vim 导航键',
  "Fuzziness": '模糊度',
  "Define the level of fuzziness for the search. The higher the fuzziness, the more results you'll get.":
    '设置搜索的模糊程度。模糊度越高，得到的结果越多。',
  'Exact match': '精确匹配',
  'Not too fuzzy': '适度模糊',
  'Fuzzy enough': '充分模糊',

  'User Interface': '用户界面',
  'Show ribbon button': '显示侧边栏按钮',
  'Add a button on the sidebar to open the Vault search modal.':
    '在侧边栏添加按钮以打开库搜索。',
  'Show excerpts': '显示摘要',
  'Shows the contextual part of the note that matches the search. Disable this to only show filenames in results.':
    '显示笔记中匹配搜索的上下文。关闭后结果中只显示文件名。',
  'Prefer body matches in excerpts': '摘要中优先显示正文匹配',
  'When a note matches both in its properties (frontmatter) and in its body, center the excerpt on the first body match. Notes that only match in their properties still show the properties. Disable to always use the first match in the file.':
    '当笔记的属性和正文都匹配时，摘要将围绕第一个正文匹配显示。仅在属性中匹配的笔记仍会显示属性。关闭后始终使用文件中的第一个匹配项。',
  'Show embed references': '显示嵌入引用',
  'Render line return in excerpts': '在摘要中渲染换行',
  'Activate this option to render line returns in result excerpts.':
    '启用后在结果摘要中渲染换行。',
  'Show "Create note" button': '显示“创建笔记”按钮',
  'Highlight matching words in results': '高亮结果中的匹配词',
  'Will highlight matching results when enabled. See README for more customization options.':
    '启用后高亮匹配结果。更多自定义选项请参阅 README。',

  'Results weighting': '结果权重',
  'File name & declared aliases': '文件名及声明的别名',
  'File directory': '文件目录',
  'Headings level 1': '一级标题',
  'Headings level 2': '二级标题',
  'Headings level 3': '三级标题',
  "Tags": '标签',
  'Header properties fields': '标题属性字段',
  'Property name': '属性名称',
  "Remove": '移除',
  'Add a new property': '添加新属性',
  'Recency boost (experimental)': '新近度加权（实验性）',
  "Disabled": '禁用',
  '24 hours': '24 小时',
  '7 days': '7 天',
  '30 days': '30 天',

  'API Access Through HTTP': '通过 HTTP 访问 API',
  'Enable the HTTP server': '启用 HTTP 服务器',
  'HTTP Port': 'HTTP 端口',
  'Show a notification when the server starts': '服务器启动时显示通知',
  'Will display a notification if the server is enabled, at Obsidian startup.':
    '如果已启用服务器，将在 Obsidian 启动时显示通知。',

  'Danger Zone': '危险区域',
  'Ignore diacritics': '忽略变音符号',
  'You probably should NOT disable this.': '通常不应禁用此设置。',
  'Ignore Arabic diacritics (beta)': '忽略阿拉伯语变音符号（测试版）',
  'Disable on this device': '在此设备上禁用',
  'Disable Omnisearch on this device only.': '仅在此设备上禁用 Omnisearch。',
  'Needs a restart to fully take effect.': '需要重启才能完全生效。',
  'Force save the cache': '强制保存缓存',
  'Enabling this setting could lead to crash loops':
    '启用此设置可能导致崩溃循环',
  'Clear cache data': '清空缓存数据',
  'Clear cache': '清空缓存',

  'Create note': '创建笔记',
  'In-File search': '文件内搜索',
  'Vault search': '库搜索',
  'to navigate': '导航',
  'to open': '打开',
  'to switch to Vault Search': '切换到库搜索',
  'to go back to Vault Search': '返回库搜索',
  'to close': '关闭',
  'to open in a new pane': '在新窗格中打开',
  'to switch to In-File Search': '切换到文件内搜索',
  'to cycle history': '切换历史记录',
  'to open in a new split': '在新分栏中打开',
  'to open in the background': '在后台打开',
  'to create': '创建',
  'to create in a new pane': '在新窗格中创建',
  'to insert a link': '插入链接',
  'to toggle excerpts': '切换摘要',
  "hold": '按住',
  'Lazy load content': '延迟加载内容',
  'Not created yet, select to create': '尚未创建，选择即可创建',
  'The document above is embedded in this note': '上方文档嵌入在此笔记中',
  'Loading cache...': '正在加载缓存……',
  'Reading files...': '正在读取文件……',
  'Indexing files...': '正在索引文件……',
  'Updating cache...': '正在更新缓存……',
  'Your files have been indexed.': '文件索引已完成。',
  'Cache cleared. Please restart Obsidian.': '缓存已清空，请重启 Obsidian。',
  'Disabled. Please restart Obsidian.': '已禁用，请重启 Obsidian。',
  'Enabled. Please restart Obsidian.': '已启用，请重启 Obsidian。',
  'Started HTTP server on port': 'HTTP 服务器已启动，端口',
  'terminated HTTP server': 'HTTP 服务器已关闭',
  'No active editor': '没有活动编辑器',
  'Cache missing or invalid. Some freezes may occur while Omnisearch indexes your vault.':
    '缓存缺失或无效。Omnisearch 为库建立索引时可能会短暂卡顿。',
  'There was an error while loading the cache. Please restart Obsidian.':
    '加载缓存时出错，请重启 Obsidian。',
  'Omnisearch can index file names of unsupported files, such as .mp4 or non-extracted PDFs and images.':
    'Omnisearch 可索引不受支持文件的<strong>名称</strong>，例如 .mp4 或未提取内容的 PDF 和图像。',
  '"Obsidian setting" will respect the value of "Files & Links > Detect all file extensions".':
    '“Obsidian 设置”将遵循“文件与链接 > 检测所有文件扩展名”的值。',
  'Some results are': '部分结果是',
  "embedded": '嵌入',
  'in other notes.': '在其他笔记中。',
  'This setting controls the maximum number of embeds to show in the search results. Set to 0 to disable.':
    '此设置控制搜索结果中最多显示的嵌入数量，设为 0 可禁用。',
  'Also works with Text Extractor for embedded images and documents.':
    '也可用于 Text Extractor 提取的嵌入图像和文档。',
  'Shows a button next to the search input, to create a note.':
    '在搜索框旁显示创建笔记按钮。',
  'Acts the same as the': '效果与',
  'shortcut, can be useful for mobile device users.':
    '快捷键相同，适合移动设备用户。',
  'Omnisearch can be used through a simple HTTP server':
    '可通过简单的 HTTP 服务器使用 Omnisearch',
  'more information': '更多信息',
  'Normalize diacritics in search terms. Words like "brûlée" or "žluťoučký" will be indexed as "brulee" and "zlutoucky".':
    '规范化搜索词中的变音符号。例如“brûlée”和“žluťoučký”会按“brulee”和“zlutoucky”建立索引。',
  'Omnisearch has a security feature that automatically disables cache writing if it cannot fully perform the operation.':
    'Omnisearch 具有安全机制：如果无法完整完成操作，会自动禁用缓存写入。',
  'Use this option to force the cache to be saved, even if it causes a crash.':
    '此选项可强制保存缓存，即使可能导致崩溃。',
  'Erase all Omnisearch cache data.': '删除所有 Omnisearch 缓存数据。',
  'Use this if Omnisearch results are inconsistent, missing, or appear outdated.':
    '当搜索结果不一致、缺失或过期时可使用此功能。',
  'Navigate down the results with': '向下浏览结果：',
  'or navigate up with': '向上浏览：',
  'We found 0 results for your search here.': '此处未找到与你搜索匹配的结果。',
  'Changing this setting will clear the cache.': '更改此设置会清空缓存。',
  'Omnisearch requires': 'Omnisearch 需要',
  'If both AI Image Analyzer and Text Extractor are enabled, Text Extractor will only be used as a fallback.':
    '如果同时启用 AI Image Analyzer 和 Text Extractor，Text Extractor 仅作为后备。',
  'Omnisearch will use Text Extractor to index the content of your office documents (currently .docx and .xlsx).':
    'Omnisearch 将使用 Text Extractor 索引办公文档内容（目前支持 .docx 和 .xlsx）。',
  'Omnisearch can index file<strong>names</strong> of "unsupported" files, such as e.g. .mp4 or non-extracted PDFs & images.':
    'Omnisearch 可索引“不受支持”文件的<strong>名称</strong>，例如 .mp4 或未提取内容的 PDF 和图像。',
  'In addition to standard md files, Omnisearch can also index other PLAINTEXT files.':
    '除标准 md 文件外，Omnisearch 还可索引其他纯文本文件。',
  'Add extensions separated by a space, without the dot. Example: "txt org csv".':
    '以空格分隔添加扩展名，不要加点号。示例：“txt org csv”。',
  'Enable this to also index files that have no file extension.':
    '启用后也会索引没有扩展名的文件。',
  'Omnisearch will use Text Extractor to index the content of your office documents (currently':
    'Omnisearch 将使用 Text Extractor 索引办公文档内容（目前支持',
  "and": '和',
  'In addition to standard': '除标准',
  'files, Omnisearch can also index other': '文件外，Omnisearch 还可索引其他',
  "PLAINTEXT": '纯文本',
  'files.': '文件。',
  'Add extensions separated by a space, without the dot. Example:':
    '以空格分隔添加扩展名，不要加点号。示例：',
  'Files that are not detected as': '未被检测为',
  'files will be ignored.': '的文件将被忽略。',
  'Enable this to also index files that have': '启用后也会索引具有',
  'no file extension': '无扩展名',
  'This can be useful for e.g. files without extensions, or for files with an extension that is not in the list above.':
    '这对于没有扩展名的文件，或扩展名不在上述列表中的文件很有用。',
}

export type TranslationKey = keyof typeof data

export function translate(language: string, key: string): string {
  const normalized = language.replace('_', '-').toLowerCase()
  if (normalized === 'en' || normalized.startsWith('en-')) return key
  if (normalized === 'zh' || normalized.startsWith('zh-'))
    return data[key as TranslationKey] ?? key
  return key
}

export function t(key: TranslationKey): string {
  return translate(getLanguage(), key)
}
