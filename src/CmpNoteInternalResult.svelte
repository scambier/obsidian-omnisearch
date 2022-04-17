<script lang="ts">
import type { SearchMatch } from "./globals"

export let match: SearchMatch
</script>

<div class="suggestion-item omnisearch-result">
  <div class="omnisearch-result__body">
    {JSON.stringify(match)}
  </div>
</div>
