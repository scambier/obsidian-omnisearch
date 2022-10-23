<script lang="ts">
  import { debounce } from 'obsidian'
  import { toggleInputComposition } from 'src/globals'
  import { createEventDispatcher, tick } from 'svelte'
  import { cacheManager } from "../cache-manager"

  export let initialValue = ''
  export let placeholder = ''
  let value = ''
  let elInput: HTMLInputElement
  const dispatch = createEventDispatcher()

  $: {
    if (initialValue) {
      value = initialValue
      selectInput()
    }
  }

  async function selectInput() {
    await tick()
    elInput.focus()
    await tick()
    elInput.select()
    await tick()
  }

  const debouncedOnInput = debounce(() => {
    // If typing a query and not executing it,
    // the next time we open the modal, the search field will be empty
    cacheManager.addToSearchHistory('')
    dispatch('input', value)
  }, 200)
</script>

<div class="omnisearch-input-container">
  <div class="omnisearch-input-field">
    <input
      bind:this="{elInput}"
      bind:value
      class="prompt-input"
      on:compositionend="{_ => toggleInputComposition(false)}"
      on:compositionstart="{_ => toggleInputComposition(true)}"
      on:input="{debouncedOnInput}"
      {placeholder}
      spellcheck="false"
      type="text"/>
  </div>
  <slot></slot>
</div>
