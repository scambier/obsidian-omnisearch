# Contributing to Omnisearch

_<small>This document is a Work In Progress.</small>_

Thank you for wanting to make Omnisearch an even better plugin :)

Please read this document before beginning work on a Pull Request.

## Preface

- Omnisearch is a personal hobby project. I'm happy to discuss about your ideas and additions, but ultimately it is my code to grow and maintain.
- Always file an issue/feature request before working on a PR, to make sure we're aligned and no-one is making useless work.
- Omnisearch is still in its infancy: some important features are missing, and there will be architectural changes.
  - As such, I may refuse your PR simply because it will have to be refactored in a short-ish term

## Code guidelines

- Respect the existing style
- Don't add npm dependencies if you can avoid it. If a new dependency is unavoidable, be mindful of its size, freshness and added value.
- Use Svelte for all UI needs.
- Try to not shoehorn your code into existing functions or components.
- Simple is better. OOP is not inevitable. Simple functions often work as well, if not better.
- If you must use OOP, avoid inheritance as much as possible, no one likes digging several layers of abstraction.
- Comment the code. What, why, how, just make your intent clear.

## Philosphy

Always respect those UI & UX points:
- The core feature of Omnisearch is its "smartness".
  - The simplest queries must bring relevant results.
- The search interface is a means to an end.
  - The less user interactions, the better.
  - All settings must have sane defaults.
- The UI must not block / show visible lag.
- Keyboard navigation first
- If you're adding a feature, make it toggleable (if desirable).
- The results must always come fast by default.

## Style guidelines

(todo)
