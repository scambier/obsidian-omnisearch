import { Modal } from "obsidian";
import type OmnisearchPlugin from "./main";
import CmpModal from "./CmpModal.svelte";

export class OmnisearchModal extends Modal {
  constructor(plugin: OmnisearchPlugin) {
    super(plugin.app);
    this.modalEl.addClass("omnisearch-modal", "prompt");
    this.modalEl.replaceChildren(); // Remove all the default Modal's children

    new CmpModal({
      target: this.modalEl,
      props: {
        modal: this,
        plugin,
      },
    });
  }

  onOpen(): void {
    // this.containerEl.style.border = '1px solid red'
    // this.modalEl.style.border = '1px solid blue'
    // this.contentEl.style.border = '1px solid green'
  }
}
