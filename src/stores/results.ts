import type { ResultNote } from 'src/globals'
import { writable } from 'svelte/store'

function createSearchResultsStore() {
  const { subscribe, set, update } = writable<ResultNote[]>([])

  return {
    subscribe,
    add: (item: ResultNote) =>
      update(arr => {
        arr.push(item)
        return arr
      }),
    set: (items: ResultNote[]) => set(items),
    reset: () => set([]),
  }
}

export const searchResultsStore = createSearchResultsStore()
