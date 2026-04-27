import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

// This is the devtools panel component for TanStack Query
// It's rendered in the root layout
export default {
  name: 'Tanstack Query',
  render: <ReactQueryDevtoolsPanel />,
}
