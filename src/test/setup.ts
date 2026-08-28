import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver, which Recharts' <ResponsiveContainer>
// relies on — stub it so components that render charts don't crash in tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
