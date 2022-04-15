<script lang="ts">
	export let title = ''
	export let content = ''
	export let id = ''
	export let nbMatches = 0
</script>

<div data-note-id={id} class="omnisearch-result">
	<span class="omnisearch-result__title">
		{@html title}
	</span>
	<span class="omnisearch-result__counter">
		{nbMatches}
		{#if nbMatches > 1}matches{:else}match{/if}
	</span>
	<div class="omnisearch-result__body">
		{@html content}
	</div>
</div>

