<script lang="ts">
  import { debounce } from 'obsidian'
  import { toggleInputComposition } from 'src/globals'
  import { createEventDispatcher, tick } from 'svelte'
  import { cacheManager } from '../cache-manager'

  export let initialValue = ''
  let initialSet = false
  export let placeholder = ''
  let value = ''
  let elInput: HTMLInputElement
  const dispatch = createEventDispatcher()

  $: {
    if (initialValue && !initialSet && !value) {
      initialSet = true
      value = initialValue
      selectInput()
    }
  }

  function selectInput(_?: HTMLElement): void {
    tick()
      .then(() => {
        elInput.focus()
        return tick()
      })
      .then(() => {
        elInput.select()
      })
  }

  const debouncedOnInput = debounce(() => {
    // If typing a query and not executing it,
    // the next time we open the modal, the search field will be empty
    cacheManager.addToSearchHistory('')
    dispatch('input', value)
  }, 500)
</script>

<div class="omnisearch-input-container">
  <div class="omnisearch-input-field">
    <input
      bind:this="{elInput}"
      bind:value
      class="prompt-input"
      use:selectInput
      on:compositionend="{_ => toggleInputComposition(false)}"
      on:compositionstart="{_ => toggleInputComposition(true)}"
      on:input="{debouncedOnInput}"
      placeholder="{placeholder}"
      spellcheck="false"
      type="text" />
  </div>
  <slot />
</div>
