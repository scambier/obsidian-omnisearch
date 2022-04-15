<script lang="ts">
export let title = ''
export let content = ''
export let id = ''
export let nbMatches = 0
export let selected = false
</script>

<div data-note-id={id} class="suggestion-item omnisearch-result"
  class:is-selected="{selected}">
  <span class="omnisearch-result__title">
    {@html title}
  </span>
  <span class="omnisearch-result__counter">
    {nbMatches}&nbsp;{nbMatches > 1 ? 'matches' : 'match'}
  </span>
  <div class="omnisearch-result__body">
    {@html content}
  </div>
</div>
