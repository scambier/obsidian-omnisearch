<script lang="ts">
  import { debounce, Platform } from 'obsidian'
  import { toggleInputComposition } from '../globals'
  import { createEventDispatcher, tick } from 'svelte'
  import type OmnisearchPlugin from '../main'
  import { wait } from '../tools/utils'

  export let initialValue = ''
  export let placeholder = ''
  export let plugin: OmnisearchPlugin
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
      .then(async () => {
        if (Platform.isMobileApp) await wait(200)
        elInput.focus()
        return tick()
      })
      .then(async () => {
        if (Platform.isMobileApp) await wait(200)
        elInput.select()
      })
  }

  const debouncedOnInput = debounce(() => {
    // If typing a query and not executing it,
    // the next time we open the modal, the search field will be empty
    plugin.searchHistory.addToHistory('')
    dispatch('input', value)
  }, 300)
</script>

<div class="omnisearch-input-container">
  <div class="omnisearch-input-field">
    <input
      bind:this="{elInput}"
      bind:value="{value}"
      class="prompt-input"
      on:compositionend="{_ => toggleInputComposition(false)}"
      on:compositionstart="{_ => toggleInputComposition(true)}"
      on:input="{debouncedOnInput}"
      placeholder="{placeholder}"
      spellcheck="false"
      type="text"
      use:selectInput />
  </div>
  <slot />
</div>
