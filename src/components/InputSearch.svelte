<script lang="ts">
  import { debounce } from 'obsidian'
  import { toggleInputComposition } from 'src/globals'
  import { createEventDispatcher, tick } from 'svelte'
  import { cacheManager } from '../cache-manager'

  export let initialValue = ''
  export let placeholder = ''
  let initialSet = false
  let value = ''
  let elInput: HTMLInputElement
  const dispatch = createEventDispatcher()

  export function setInputValue(v: string): void {
    value = v
  }

  function watchInitialValue(v: string): void {
    if (v && !initialSet && !value) {
      initialSet = true
      value = v
      selectInput()
    }
  }

  $: watchInitialValue(initialValue)

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
  }, 300)
</script>

<div class="omnisearch-input-container">
  <div class="omnisearch-input-field">
    <input
      bind:this="{elInput}"
      bind:value="{value}"
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
