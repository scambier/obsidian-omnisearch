import { EventBus } from '../tools/event-bus'

describe('EventBus', () => {
  it('should refuse the registering of invalid ctx/event names', () => {
    const eventBus = new EventBus()
    expect(() => eventBus.on('@', 'event', () => {})).toThrowError(
      'Invalid context/event name - Cannot contain @'
    )
    expect(() => eventBus.on('context', '@', () => {})).toThrowError(
      'Invalid context/event name - Cannot contain @'
    )
  })

  it('should emit different events to the same context', () => {
    // Arrange
    const bus = new EventBus()
    const cb = jest.fn()
    bus.on('context', 'event1', cb)
    bus.on('context', 'event2', cb)

    // Act
    bus.emit('event1', 'PARAM_1')
    bus.emit('event2', 'PARAM_2')

    // Assert
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenNthCalledWith(1, 'PARAM_1')
    expect(cb).toHaveBeenNthCalledWith(2, 'PARAM_2')
  })

  it('should emit the same events to different contexts', () => {
    // Arrange
    const bus = new EventBus()
    const cb1 = jest.fn()
    const cb2 = jest.fn()
    bus.on('context1', 'event', cb1)
    bus.on('context2', 'event', cb2)

    // Act
    bus.emit('event', 'PARAM_1')

    // Assert
    expect(cb1).toHaveBeenCalledTimes(1)
    expect(cb1).toHaveBeenNthCalledWith(1, 'PARAM_1')
    expect(cb2).toHaveBeenCalledTimes(1)
    expect(cb2).toHaveBeenNthCalledWith(1, 'PARAM_1')
  })

  it('should forward multiple arguments', () => {
    // Arrange
    const bus = new EventBus()
    const cb = jest.fn()
    bus.on('context', 'event', cb)

    // Act
    bus.emit('event', 'foo', 'bar')

    // Assert
    expect(cb).toHaveBeenCalledWith('foo', 'bar')
  })

  it('should not emit events for disabled contexts', () => {
    // Arrange
    const bus = new EventBus()
    const cb = jest.fn()
    bus.on('context', 'event', cb)
    bus.disable('context')

    // Act
    bus.emit('event', 'foo', 'bar')

    // Assert
    expect(cb).not.toHaveBeenCalled()
  })

  it('should emit events for enabled contexts', () => {
    // Arrange
    const bus = new EventBus()
    const cb = jest.fn()
    bus.on('context', 'event', cb)
    bus.disable('context')
    bus.enable('context')

    // Act
    bus.emit('event', 'foo', 'bar')

    // Assert
    expect(cb).toHaveBeenCalledWith('foo', 'bar')
  })

  it('should unregister contexts', () => {
    // Arrange
    const bus = new EventBus()
    const cb = jest.fn()
    bus.on('context1', 'event', cb)
    bus.on('context2', 'event', cb)
    bus.off('context1')

    // Act
    bus.emit('event', 'foo', 'bar')

    // Assert
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('should unregister single events', () => {
    // Arrange
    const bus = new EventBus()
    const cb1 = jest.fn()
    const cb2 = jest.fn()
    bus.on('context', 'event1', cb1)
    bus.on('context', 'event2', cb2)
    bus.off('context', 'event2')

    // Act
    bus.emit('event1')
    bus.emit('event2')

    // Assert
    expect(cb1).toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
  })
})
