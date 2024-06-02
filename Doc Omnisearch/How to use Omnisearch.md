Omnisearch is designed to be as unobtrusive as possible. Install it, let it index your vault, and it works.

It is quite different than the core search plugin, and is not intended to replace it. ==**It's a tool to help you find your notes as fast as possible**==. If you're well organized, know what is in your vault and where each note is located, it won't probably be very useful to you.

But if your vault looks like a messy desk full of scattered papers and post-it notes, Omnisearch might be the tool you need.

## Omnisearch contexts

### Vault Search

Omnisearch's core feature, accessible with the Command Palette "**_Omnisearch: Vault search_**". This modal searches through your vault and returns the most relevant documents. That's all you need to find a note.

If you want to list all the search matches of a single note, you can do so by using `tab` to open the **In-File Search**.

### In-File Search

Also accessible through the Command Palette "**_Omnisearch: In-file search_**". This modal searches through the active note's content and lists the matching results. Press enter to automatically scroll to the right place.

Note that this modal is unavailable if your active file is not a Markdown document.

## Efficiently looking for documents

Omnisearch maintains an index of words from your notes. When you type in a query, it compares the words from your query to the words in its index, and returns the most relevant notes.

> [!IMPORTANT] The best queries are the most spontaneous
> A good query should contain the "important" words of the note you're trying to find. Important words are the first words that come to your mind when you think about a note. 

They're the ones in the filename, directory, in the titles, that are often repeated throughout the note, or quite unique to it.

While Omnisearch does not have the advanced features of the core search, there are a few options you can use to filter results.

## Advanced tips

- Use `path:"<somepath>"` to restrict your results to corresponding paths
- Use `ext:"png jpg"` or `ext:png`, or a plain `.png` to specify the filetype(s)
- Use `"exact expressions"` in quotes to further filter the results returned by the query
- Use `-exclusions` to exclude notes containing certain words