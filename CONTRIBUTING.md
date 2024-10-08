# Contributing to Omnisearch

_<small>This document is a Work In Progress.</small>_

Thank you for wanting to make Omnisearch an even better plugin :)

Please read this document before beginning work on a Pull Request.

## Preface

- Omnisearch is a personal hobby project. I'm happy to discuss about your ideas and additions, but ultimately it is my code to grow and maintain.
- ❗ Always file an issue/feature request before working on a PR, to make sure we're aligned and no-one is making useless work.

## "Good First Issue"

Are you a beginner, looking for a small open source contribution? Look at the "[good first issues](https://github.com/scambier/obsidian-omnisearch/labels/good%20first%20issue)". Those issues have a limited scope, don't require intricate knowledge of the code, and are easy enough to locate, fix, and test.

If you wish to work on one of these issues, leave a comment and I'll assign it to you and give you some pointers.

## Code guidelines

- ❗ By default, start your fork from the `develop` branch. If the `develop` branch is behind `master`, then use `master`. When in doubt, ask :)
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

- .ts files must be formatted with "Prettier ESLint"
- .svelte files must be formatted with "Svelte for VS Code"
- All CSS code **must** go into styles.css, and all classes should be properly named for easy customization. Do **not** use `<style>` tags in Svelte components