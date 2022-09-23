<script lang="ts">
  import { debounce } from 'obsidian'
  import { toggleInputComposition } from 'src/globals'
  import { createEventDispatcher, onMount, tick } from 'svelte'

  export let value = ''
  export let placeholder = ''
  const dispatch = createEventDispatcher()

  let elInput: HTMLInputElement

  onMount(async () => {
    await tick()
    elInput.focus()
    setTimeout(() => {
      // tick() is not working here?
      elInput.select()
    }, 0)
  })

  const debouncedOnInput = debounce(() => {
    dispatch('input', value)
  }, 100)
</script>

<div class="omnisearch-input-container">
  <div class="omnisearch-input-field">
    <input
      bind:value
      bind:this="{elInput}"
      on:input="{debouncedOnInput}"
      on:compositionstart="{_ => toggleInputComposition(true)}"
      on:compositionend="{_ => toggleInputComposition(false)}"
      type="text"
      class="prompt-input"
      {placeholder}
      spellcheck="false" />
  </div>
  <slot></slot>
</div>
