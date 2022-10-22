<script lang="ts">
  import { debounce } from 'obsidian'
  import { toggleInputComposition } from 'src/globals'
  import { createEventDispatcher, tick } from 'svelte'

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
    elInput.focus()
    await tick()
    elInput.select()
    await tick()
  }

  const debouncedOnInput = debounce(() => {
    dispatch('input', value)
  }, 250)
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
      spellcheck="false"/>
  </div>
  <slot></slot>
</div>
