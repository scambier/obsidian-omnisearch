export type EventBusCallback = (...args: any[]) => any

export class EventBus {
  private handlers: Map<string, EventBusCallback> = new Map()
  private disabled: string[] = []

  /**
   * Adds a subscription for `event`, for the specified `context`.
   * If a subscription for the same event in the same context already exists, this will overwrite it.
   * @param context
   * @param event
   * @param callback
   */
  public on(context: string, event: string, callback: EventBusCallback): void {
    if (context.includes('@') || event.includes('@')) {
      throw new Error('Invalid context/event name - Cannot contain @')
    }
    this.handlers.set(`${context}@${event}`, callback)
  }

  /**
   * Removes the subscription for an `event` in the `context`.
   * If `event` is left empty, removes all subscriptions.
   * @param context
   * @param event
   */
  public off(context: string, event?: string): void {
    if (event) {
      this.handlers.delete(`${context}@${event}`)
    } else {
      for (const [key] of this.handlers.entries()) {
        if (key.startsWith(`${context}@`)) {
          this.handlers.delete(key)
        }
      }
    }
  }

  /**
   * Disables a `context`. Does not remove subscriptions, but all events for related listeners will be ignored.
   * @param context
   */
  public disable(context: string): void {
    this.enable(context)
    this.disabled.push(context)
  }

  /**
   * Re-enables a `context`.
   * @param context
   */
  public enable(context: string): void {
    this.disabled = this.disabled.filter(v => v !== context)
  }

  public emit(event: string, ...args: any[]): void {
    const entries = [...this.handlers.entries()].filter(
      ([k, _]) => !this.disabled.includes(k.split('@')[0])
    )
    for (const [key, handler] of entries) {
      if (key.endsWith(`@${event}`)) {
        handler(...args)
      }
    }
  }
}
