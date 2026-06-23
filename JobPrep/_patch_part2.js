// PATCH PART 2: react-typescript-26 through react-typescript-50
"react-typescript-26": {
  answer:
`Render Props is a pattern where a component accepts a function as a prop (or as \`children\`) and calls it to delegate rendering:
\`\`\`tsx
<MouseTracker>
  {({ x, y }) => <Tooltip style={{ left: x, top: y }}>Here</Tooltip>}
</MouseTracker>
\`\`\`
\`MouseTracker\` manages mouse position state and calls \`children({ x, y })\` on each render. The consumer controls what gets rendered.

**Why it existed:** sharing stateful logic before hooks. The component owns the state; the consumer owns the rendering.

**Modern alternative: custom hooks.** \`const { x, y } = useMousePosition()\` inside any component achieves the same result without wrapper nesting and with better TypeScript ergonomics.

**Where render props still appear:**
- \`react-virtualized\`, \`react-table\`, \`downshift\` — libraries that inject rendering into complex behavior
- Cases where you need to *provide a DOM slot* from a parent to a child (distinct from just sharing state)
- \`children\` as a render prop is the standard slot pattern in compound components`,
  pros:[
    "Shares dynamic data with the consumer without dictating the rendered output",
    "Works with class components (unlike hooks)"
  ],
  cons:[
    "Adds nesting — a 'callback hell' equivalent in JSX",
    "TypeScript inference for the function prop's parameter requires explicit typing"
  ],
  useCase:
`A \`<DragSource>\` library component tracks drag state and calls \`children({ isDragging, dragHandlers })\`. The consumer renders whatever it wants using those values. The library can't know what to render — the render prop pattern hands that decision back to the consumer.`,
  alts:[
    "What is the render props pattern and when should you use it?",
    "How does render props compare to custom hooks?",
    "Why did render props fall out of fashion?"
  ]
},

"react-typescript-27": {
  answer:
`**The pattern:** Container components fetch data and manage state; Presentational components receive props and render UI.

**Pre-hooks motivation:** the only way to share stateful logic was HOCs or render props, both of which added wrapper layers. Splitting into container/presentational at least gave a clean separation of concerns without changing nesting.

**With hooks:** the same separation is achievable without two component files. Extract the logic into a custom hook; the single component calls it:
\`\`\`tsx
function TicketList() {
  const { tickets, loading, error } = useTickets(); // "container" logic in a hook
  if (loading) return <Spinner />;
  return <TicketTable tickets={tickets} />;          // presentational part inline
}
\`\`\`

**Still relevant as a mental model:** separating data concerns from UI concerns is valuable. In practice teams implement this as:
- Custom hooks for logic (testable, reusable)
- Pure UI components that accept only props (testable as pure functions)
- No rigid file split required

**The strict two-file split** (TicketListContainer.tsx + TicketList.tsx) is largely obsolete. Extract when you need to *reuse* the logic or *reuse* the UI — not as a default structure.`,
  pros:[
    "Pure presentational components (props-in, JSX-out) are trivially testable",
    "Hooks give the same separation without the extra component layer"
  ],
  cons:[
    "Strict split creates unnecessary files when logic and UI don't need to be reused separately",
    "The term 'container component' is confusing since hooks replaced that role"
  ],
  useCase:
`A design system's \`<Button>\` is purely presentational — no state, no effects. It's tested exhaustively against all prop combinations. The page component that decides *which* button to show based on permissions uses a custom hook for that logic. Same separation; no container file.`,
  alts:[
    "Is the container/presentational pattern still used in modern React?",
    "How do hooks replace the container component pattern?",
    "When should I split a component into container and presentational?"
  ]
},

"react-typescript-28": {
  answer:
`Error Boundaries catch JavaScript errors thrown during rendering, in lifecycle methods, and in constructors of children in the tree — and render a fallback UI instead of crashing the app.

They still require a **class component** (no hook equivalent):
\`\`\`tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logErrorToService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}
\`\`\`

**Placement strategy:** wrap each major UI section separately. One global boundary catches everything but shows the whole page as broken. Section-level boundaries isolate failures.

**What they don't catch:** errors in event handlers, async code (\`setTimeout\`, \`fetch\`), or server-side rendering. Those need try/catch.`,
  pros:[
    "Prevents one broken component from crashing the entire app",
    "componentDidCatch gives structured error reporting (component stack)"
  ],
  cons:[
    "Class-only — you need to maintain at least one class component per project",
    "Doesn't catch async errors — many bugs fall outside their scope"
  ],
  useCase:
`A chat widget and an analytics panel are wrapped in separate Error Boundaries. A bug in the chart library crashes the analytics panel — the user sees an error card there but the chat still works. Without isolation, the whole app would go blank.`,
  alts:[
    "How do you implement an Error Boundary in React?",
    "Why can't Error Boundaries be functional components?",
    "What types of errors do Error Boundaries not catch?"
  ]
},

"react-typescript-29": {
  answer:
`Compound Components is a pattern where a parent manages state and exposes child components that read from it via context — giving consumers a flexible, declarative API.

\`\`\`tsx
const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [active, setActive] = useState(defaultTab);
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>;
}

Tabs.List = function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
};

Tabs.Tab = function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const { active, setActive } = useContext(TabsContext)!;
  return <button role="tab" aria-selected={active === id} onClick={() => setActive(id)}>{children}</button>;
};

Tabs.Panel = function Panel({ id, children }: { id: string; children: React.ReactNode }) {
  const { active } = useContext(TabsContext)!;
  return active === id ? <div role="tabpanel">{children}</div> : null;
};
\`\`\`

**Consumer API:**
\`\`\`tsx
<Tabs defaultTab="details">
  <Tabs.List><Tabs.Tab id="details">Details</Tabs.Tab><Tabs.Tab id="notes">Notes</Tabs.Tab></Tabs.List>
  <Tabs.Panel id="details"><TicketDetails /></Tabs.Panel>
  <Tabs.Panel id="notes"><TicketNotes /></Tabs.Panel>
</Tabs>
\`\`\``,
  pros:[
    "Consumers arrange pieces freely without fighting a monolithic API",
    "State management is invisible to the consumer — context handles it"
  ],
  cons:[
    "TypeScript typing for the namespace (Tabs.Tab, Tabs.Panel) requires explicit assignment",
    "Non-compound-compatible children (plain strings) don't get context and silently fail"
  ],
  useCase:
`A design system \`<Select>\` with \`<Select.Trigger>\`, \`<Select.Options>\`, \`<Select.Option>\`. Teams can reorder or omit sections while the select behavior stays consistent. No prop API change when layout requirements differ.`,
  alts:[
    "What is the Compound Components pattern in React?",
    "How do you share state between sibling components without prop drilling?",
    "How does Radix UI use the Compound Components pattern?"
  ]
},

"react-typescript-30": {
  answer:
`Three main approaches:

**\`useEffect\` + local state (DIY):**
\`\`\`ts
useEffect(() => {
  let cancelled = false;
  fetch('/api/tickets').then(r => r.json())
    .then(d => { if (!cancelled) setData(d); })
    .catch(e => { if (!cancelled) setError(e.message); });
  return () => { cancelled = true; };
}, []);
\`\`\`
Works but you re-invent caching, deduplication, refetching, and error handling every time.

**React Query (TanStack Query):** handles caching, background refetch, stale-while-revalidate, loading/error states, deduplication.
\`\`\`ts
const { data, isLoading, error } = useQuery({
  queryKey: ['tickets'],
  queryFn: () => fetch('/api/tickets').then(r => r.json())
});
\`\`\`

**SWR (Vercel):** similar to React Query, slightly simpler API, stale-while-revalidate focus.

**My default:** React Query. It solves the problems you'd otherwise reinvent — especially optimistic updates, invalidation, and pagination.`,
  pros:[
    "React Query deduplicates identical requests automatically",
    "Background refetch keeps data fresh without user action",
    "Loading/error/success states handled without boilerplate"
  ],
  cons:[
    "React Query adds bundle size (~12KB gzipped) — overkill for very simple apps",
    "useEffect + fetch is fine for one-off simple cases — don't add a library for a single call"
  ],
  useCase:
`A ticket list page. React Query: the data loads on mount, stays cached for 5 minutes, refreshes in the background when the window refocuses, and shows the stale list while the fresh one is loading. All in 5 lines.`,
  alts:[
    "How should I fetch data in a React component?",
    "What is the difference between React Query and SWR?",
    "Why is useEffect + fetch bad for data fetching?"
  ]
},

"react-typescript-31": {
  answer:
`**Core concepts of TanStack Query:**

**Queries** — read data:
\`\`\`ts
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['tickets', { status: 'open', page }], // hierarchical key
  queryFn: () => api.getTickets({ status: 'open', page }),
  staleTime: 5 * 60 * 1000,   // fresh for 5 min
  gcTime: 10 * 60 * 1000,     // cache survives 10 min after last use
});
\`\`\`

**Mutations** — write data:
\`\`\`ts
const { mutate } = useMutation({
  mutationFn: (id: string) => api.resolveTicket(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  // or optimistic:
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['tickets'] });
    const prev = queryClient.getQueryData(['tickets']);
    queryClient.setQueryData(['tickets'], (old) => old.map(t => t.id === id ? {...t, status:'resolved'} : t));
    return { prev };
  },
  onError: (_, __, ctx) => queryClient.setQueryData(['tickets'], ctx.prev),
});
\`\`\`

**Invalidation:** \`queryClient.invalidateQueries({ queryKey: ['tickets'] })\` marks all ticket queries stale and refetches active ones immediately.`,
  pros:[
    "Automatic caching, deduplication, and background refresh out of the box",
    "Optimistic updates with rollback make UX feel instant",
    "Query key hierarchy enables targeted bulk invalidation"
  ],
  cons:[
    "Mental model (staleTime vs gcTime vs refetchOnMount) has a learning curve",
    "Optimistic update code is verbose"
  ],
  useCase:
`Agent resolves a ticket. \`onMutate\` immediately updates the UI (ticket shows resolved), \`onSuccess\` invalidates the list so it refetches. If the API call fails, \`onError\` rolls back to the previous state. User sees instant feedback; no stale data.`,
  alts:[
    "How does React Query caching work?",
    "How do you implement optimistic updates with React Query?",
    "What is the difference between staleTime and gcTime?"
  ]
},

"react-typescript-32": {
  answer:
`Every data-fetching component needs to explicitly handle all three non-happy-path states.

**Pattern with React Query:**
\`\`\`tsx
function TicketList() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets });

  if (isLoading) return <TicketListSkeleton />;          // loading state
  if (isError)   return <ErrorState message={error.message} onRetry={refetch} />;  // error state
  if (!data || data.length === 0) return <EmptyState message="No tickets yet." action={<CreateTicketButton/>} />;  // empty state
  return <TicketTable tickets={data} />;                 // happy path
}
\`\`\`

**Skeleton screens** are better than spinners for perceived performance — they match the shape of the content so the layout doesn't shift.

**Error states** should be actionable: show what went wrong and offer a retry. Don't just say "Error."

**Empty states** should explain why it's empty and guide next action: "You have no open tickets. Create one?" Not just a blank area.

**Declarative alternative:** Suspense + Error Boundary lets the component just render the data; boundaries handle the other states.`,
  pros:[
    "Explicit handling of all paths prevents confusing blank screens",
    "Skeleton screens improve perceived performance vs spinners"
  ],
  cons:[
    "More code per component — Suspense + Error Boundary can centralize this",
    "Skeleton components must be maintained alongside real components"
  ],
  useCase:
`A dashboard widget: loading → skeleton matching widget layout. Error → error card with retry button. Empty → 'No data in the selected range' with a link to change filters. Data → the chart. Covers every path; no blank screen.`,
  alts:[
    "How do you handle loading and error states when fetching data in React?",
    "What should an empty state look like in a React app?",
    "How does Suspense change how you handle loading states?"
  ]
},

"react-typescript-33": {
  answer:
`React Router v6 changed significantly from v5.

**Key API changes:**
- Routes match exactly by default (no \`exact\` prop needed)
- Nested routes defined inline as \`children\`, rendered at \`<Outlet />\`
- \`<Switch>\` replaced by \`<Routes>\`

**Data router (v6.4+):** \`createBrowserRouter\` enables loaders and actions:
\`\`\`ts
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'tickets',
        element: <TicketLayout />,
        loader: async () => fetch('/api/tickets').then(r => r.json()),
        children: [
          { index: true, element: <TicketList /> },
          {
            path: ':id',
            element: <TicketDetail />,
            loader: async ({ params }) => fetch(\`/api/tickets/\${params.id}\`).then(r => r.json()),
            action: async ({ request, params }) => { /* handle form POST */ }
          }
        ]
      }
    ]
  }
]);
\`\`\`

**In components:**
\`\`\`ts
const tickets = useLoaderData() as Ticket[];
const { id } = useParams();
const navigate = useNavigate();
\`\`\``,
  pros:[
    "Loaders run before render — data is ready when the component mounts (no loading spinner inside the component)",
    "Nested routes + Outlet makes layout composition clean",
    "Actions handle form submissions server-side style — works with <Form> component"
  ],
  cons:[
    "Loaders tightly couple data fetching to routes — doesn't integrate with React Query's caching",
    "v6.4 API is very different from v5 — migration cost on large apps"
  ],
  useCase:
`Navigating to \`/tickets/123\` triggers the loader which fetches ticket 123. The component mounts with data already available — no \`useEffect\` + \`useState\` fetch pattern. Nested route renders inside \`<Outlet />\` in the parent layout.`,
  alts:[
    "What changed in React Router v6?",
    "What is useLoaderData in React Router?",
    "How do nested routes work with Outlet in React Router v6?"
  ]
},

"react-typescript-34": {
  answer:
`**Controlled component:** React state is the single source of truth.
\`\`\`tsx
const [email, setEmail] = useState('');
<input value={email} onChange={e => setEmail(e.target.value)} />
\`\`\`
Every keystroke triggers a re-render and a state update. Easy to validate, format, or sync values in real time.

**Uncontrolled component:** the DOM holds the state; you read it via a ref on demand.
\`\`\`tsx
const emailRef = useRef<HTMLInputElement>(null);
<input defaultValue="" ref={emailRef} />
// On submit: emailRef.current?.value
\`\`\`
No re-render on keystroke — good for simple forms where you only need values on submit.

**React Hook Form** uses uncontrolled inputs with refs internally — that's why it doesn't re-render on each keystroke and is faster than Formik for large forms.

**When to use which:**
- Controlled: real-time validation, dependent fields (country → state select), formatting as-you-type
- Uncontrolled: simple forms where values are only needed on submit, file inputs (\`<input type="file">\` must be uncontrolled)`,
  pros:[
    "Controlled: full control over validation timing and error display",
    "Uncontrolled: zero re-renders per keystroke — better performance on large forms"
  ],
  cons:[
    "Controlled: every keystroke triggers a re-render — can be slow on complex forms",
    "Uncontrolled: harder to programmatically reset, prefill, or sync values"
  ],
  useCase:
`A 'Create Ticket' form with real-time character counting on the description field uses controlled input. A bulk upload form where you only need the file path on submit uses uncontrolled. React Hook Form handles both internally.`,
  alts:[
    "What is a controlled component in React?",
    "Why does React Hook Form use uncontrolled components?",
    "When should I use ref instead of state for form inputs?"
  ]
},

"react-typescript-35": {
  answer:
`**React Hook Form (RHF):**
- Uses uncontrolled inputs — no re-render per keystroke
- \`register\`, \`handleSubmit\`, \`formState.errors\` API
- Integrates with Zod/Yup via \`zodResolver\`
- Excellent TypeScript inference with generics

\`\`\`ts
const schema = z.object({
  email: z.string().email(),
  priority: z.enum(['low','medium','high']),
});
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
\`\`\`

**Formik:**
- Controlled inputs — re-renders on each field change
- \`Formik\` component or \`useFormik\` hook
- Yup-based validation natively
- More verbose, slower on large forms

**Trade-offs:**
| | RHF | Formik |
|---|---|---|
| Performance | Excellent (uncontrolled) | Good (but re-renders on change) |
| Bundle size | ~9KB | ~15KB |
| TypeScript | Excellent | Good |
| Learning curve | Moderate | Moderate |

**My recommendation:** React Hook Form + Zod. The combination gives you performant forms with compile-time type safety on schema validation.`,
  pros:[
    "RHF's uncontrolled approach eliminates keystroke re-renders on large forms",
    "Zod resolvers give TypeScript-first validation with inferred form types"
  ],
  cons:[
    "RHF's ref-based approach is harder to integrate with controlled UI libraries (though Controller wrapper handles it)",
    "Formik's controlled model is simpler to reason about for beginners"
  ],
  useCase:
`A ticket creation form with 15 fields, conditional sections, and real-time character counts. RHF handles performance (no re-renders on typing). Zod schema shared between frontend validation and backend API validation — one source of truth.`,
  alts:[
    "React Hook Form vs Formik — which should I use?",
    "How do you use Zod with React Hook Form?",
    "Why is React Hook Form faster than Formik?"
  ]
},

"react-typescript-36": {
  answer:
`The **React Testing Library (RTL)** philosophy: test from the user's perspective. Query by what the user sees (text, role, label), not by implementation details (component state, CSS classes).

\`\`\`tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submitting login form calls onLogin', async () => {
  const onLogin = jest.fn();
  render(<LoginForm onLogin={onLogin} />);

  await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(onLogin).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret123' });
});
\`\`\`

**Query priority (RTL docs):** \`getByRole\` > \`getByLabelText\` > \`getByPlaceholderText\` > \`getByText\` > \`getByTestId\`. Roles and labels match how screen readers and users experience the UI.

**Don't test:** component internals, implementation (\`useState\` values), CSS classes, exact rendered HTML structure. These make tests brittle — a refactor breaks tests without breaking behavior.`,
  pros:[
    "Tests that survive refactors — only break when behavior breaks",
    "Forces accessible markup — getByRole only works if elements have correct roles/labels"
  ],
  cons:[
    "Async queries (findBy*) are needed for anything that updates asynchronously",
    "Some interactions (complex drag-and-drop, canvas) are hard to test via RTL"
  ],
  useCase:
`A test for 'resolving a ticket' clicks the Resolve button, waits for the success toast to appear, and asserts the ticket status chip changes to 'Resolved'. It doesn't check what \`useState\` holds — just what the user sees.`,
  alts:[
    "What is the philosophy behind React Testing Library?",
    "What query should I use in React Testing Library?",
    "What should I avoid testing in React components?"
  ]
},

"react-typescript-37": {
  answer:
`Three levels, each with a different scope/cost trade-off:

**Unit tests:** single function, hook, or isolated component. Fast, deterministic. Use for:
- Pure functions (formatters, validators, reducers)
- Custom hooks via \`renderHook\`
- Pure presentational components with many prop variations

**Integration tests (RTL):** render a component tree with mocked network (MSW). Covers component interactions, context, routing, and data flow. The bulk of tests should live here. Catches bugs unit tests miss (wiring between components).

**E2E tests (Playwright, Cypress):** run in a real browser against a real server. Slow (minutes), occasionally flaky. Reserve for:
- Critical paths that must never break (login, checkout, ticket creation)
- Cross-browser verification

**Testing pyramid:** many unit → more integration → few e2e.

RTL tests occupy the integration tier — they're not unit tests (they render full trees and real DOM) but not e2e either (they mock the network and run in jsdom/jest).`,
  pros:[
    "Integration tests give the best ROI — catch real bugs without full browser overhead",
    "Unit tests run in milliseconds and give instant feedback during development"
  ],
  cons:[
    "E2E tests are slow and flaky — too many will hurt CI speed and reliability",
    "No test type catches everything; a pyramid strategy is needed"
  ],
  useCase:
`Team policy: reducers and formatters get unit tests, feature flows (create ticket, assign agent) get integration tests with MSW, and login + ticket submit get a 3-test Playwright suite. CI runs unit + integration in under 2 minutes; E2E runs nightly.`,
  alts:[
    "What is the testing pyramid in React?",
    "What is the difference between RTL tests and E2E tests?",
    "When should I write an E2E test vs an integration test?"
  ]
},

"react-typescript-38": {
  answer:
`Use \`renderHook\` from \`@testing-library/react\` — it renders the hook in a minimal React component so all hook rules apply.

\`\`\`ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

test('increments', () => {
  const { result } = renderHook(() => useCounter(0));
  expect(result.current.count).toBe(0);

  act(() => { result.current.increment(); });
  expect(result.current.count).toBe(1);
});
\`\`\`

**\`act\`:** wraps any state-updating calls. Without it, React warns about state updates outside act.

**Async hooks:**
\`\`\`ts
test('fetches data', async () => {
  const { result } = renderHook(() => useFetch('/api/tickets'));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual([...]);
});
\`\`\`

**Hooks that need context:** pass a \`wrapper\` option:
\`\`\`ts
const { result } = renderHook(() => useAuth(), {
  wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
});
\`\`\``,
  pros:[
    "Tests hook logic in isolation without a full component",
    "renderHook result.current always reflects latest state"
  ],
  cons:[
    "Need to wrap state updates in act() — easy to forget",
    "Can't test what the hook renders — for that, write a component test"
  ],
  useCase:
`\`useTicketFilter\` hook manages filter state and derived filtered list. Unit tests cover each filter combination and clearing. No component rendering needed — the hook behavior is fully testable via \`renderHook\`.`,
  alts:[
    "How do you test a custom hook in React?",
    "What is renderHook in React Testing Library?",
    "Do you need to wrap hook state updates in act()?"
  ]
},

"react-typescript-39": {
  answer:
`**MSW (Mock Service Worker)** intercepts HTTP requests at the network level — in the browser via a Service Worker, in Node.js/Jest via a request interceptor. Your actual \`fetch\`/\`axios\` calls run; MSW just intercepts before they hit the network.

This is better than mocking \`fetch\`: the full request-handling code path runs, so your API client config (headers, auth, error handling) is tested too.

\`\`\`ts
// handlers.ts
import { http, HttpResponse } from 'msw';
export const handlers = [
  http.get('/api/tickets', () => HttpResponse.json([{ id: '1', title: 'Bug' }])),
  http.post('/api/tickets', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '2', ...body }, { status: 201 });
  }),
];

// setupTests.ts
const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// In a test — override per test:
test('shows error on 500', () => {
  server.use(http.get('/api/tickets', () => HttpResponse.json(null, { status: 500 })));
  render(<TicketList />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
\`\`\``,
  pros:[
    "Exercises the full request path — API client, interceptors, auth headers included",
    "Shared handlers work in both browser dev and Jest tests — one source of mock truth"
  ],
  cons:[
    "Needs Service Worker registration for browser use — slight setup overhead",
    "Service Worker only works over HTTPS or localhost"
  ],
  useCase:
`The app's Axios instance adds a Bearer token to every request. MSW in tests verifies the token is sent (via \`request.headers.get('Authorization')\` in the handler) without mocking Axios internals.`,
  alts:[
    "What is MSW and how does it differ from mocking fetch?",
    "How do you test error states with Mock Service Worker?",
    "How do you set up MSW in a Jest test suite?"
  ]
},

"react-typescript-40": {
  answer:
`React Server Components (RSCs) run exclusively on the server — their code is never shipped to the browser. They can fetch data, read from databases, access secrets, and render directly to HTML/RSC format.

**Key rules:**
- No browser APIs, no hooks (useState, useEffect), no event handlers
- Can import server-only code (DB clients, secrets, fs)
- \`'use client'\` marks the boundary — components with that directive and their imports become Client Components

**In Next.js App Router:** every component is a Server Component by default:
\`\`\`tsx
// app/tickets/page.tsx — Server Component
async function TicketsPage() {
  const tickets = await db.query('SELECT * FROM tickets');  // direct DB access
  return <TicketList tickets={tickets} />;                   // rendered on server
}

// components/TicketList.tsx — Client Component
'use client';
export function TicketList({ tickets }: { tickets: Ticket[] }) {
  const [selected, setSelected] = useState<string|null>(null);
  return ...;
}
\`\`\`

The server streams HTML chunks progressively — users see content before the full page is ready.`,
  pros:[
    "Zero JS shipped for server components — smaller client bundle",
    "Direct data access without an API layer or useEffect fetch",
    "Streaming enables faster Time to First Byte and progressive rendering"
  ],
  cons:[
    "Can't use state, effects, or event handlers — requires splitting components at the boundary",
    "Mental model (server vs client) is a new concept for React developers",
    "Testing RSCs is more complex than client components"
  ],
  useCase:
`A ticket detail page: RSC fetches the ticket and its messages directly from the DB. The ticket data is rendered as static HTML. Only the 'Reply' form — which needs \`useState\` and event handlers — is a Client Component. Minimal JS shipped.`,
  alts:[
    "What are React Server Components and how do they differ from client components?",
    "What is the 'use client' directive in Next.js?",
    "Can you use hooks in a React Server Component?"
  ]
},

"react-typescript-41": {
  answer:
`Suspense in React 18 works as a declarative loading boundary. When a component inside \`<Suspense>\` "suspends" (throws a Promise), React shows the fallback until the Promise resolves.

**With React Query (using suspense mode):**
\`\`\`tsx
const { data } = useSuspenseQuery({
  queryKey: ['tickets'],
  queryFn: fetchTickets,
});
// No isLoading check — component only renders when data is ready
\`\`\`
Wrapped in:
\`\`\`tsx
<Suspense fallback={<TicketListSkeleton />}>
  <TicketList />
</Suspense>
\`\`\`

**With Next.js RSCs:** async Server Components integrate naturally — the component suspends until its async work completes. Nested Suspense boundaries let sections stream independently:
\`\`\`tsx
<Suspense fallback={<HeaderSkeleton />}><Header /></Suspense>
<Suspense fallback={<ContentSkeleton />}><MainContent /></Suspense>
\`\`\`
Each section streams as soon as it's ready — the header appears before the content.

**Concurrent features in React 18:** Suspense + \`useTransition\` + streaming SSR are all built on the same scheduler. They compose — deferred navigation shows the old page while the new page's data loads.`,
  pros:[
    "Moves loading state out of individual components — cleaner component code",
    "Nested boundaries allow granular streaming — content appears as it's ready"
  ],
  cons:[
    "Data fetching libraries must explicitly support Suspense (React Query v5, Relay) — not all do",
    "Error handling needs a separate Error Boundary alongside each Suspense boundary"
  ],
  useCase:
`A dashboard with three widgets. Each wrapped in its own Suspense boundary. The fastest widget (cached) renders immediately; the slowest shows its skeleton until its data arrives. Users see partial content instantly instead of waiting for all three.`,
  alts:[
    "How does Suspense work for data fetching in React 18?",
    "What does 'suspending' mean in React?",
    "How do you use useSuspenseQuery from React Query?"
  ]
},

"react-typescript-42": {
  answer:
`\`useTransition\` marks a state update as "non-urgent" — React can interrupt it to handle higher-priority updates (like keystrokes or clicks).

\`\`\`tsx
const [isPending, startTransition] = useTransition();

function handleSearch(query: string) {
  // Urgent: update the input value immediately
  setInputValue(query);
  // Non-urgent: filtering 10,000 results can wait
  startTransition(() => {
    setFilteredResults(bigList.filter(item => item.name.includes(query)));
  });
}
\`\`\`

Without \`startTransition\`: every keystroke blocks the thread until the filter completes — the input lags.
With \`startTransition\`: the input updates instantly; React interrupts the filter computation if another keystroke comes in.

**\`isPending\`:** true while the transition is in flight. Show a subtle indicator (not a full spinner — the user still sees the old results, not a blank screen):
\`\`\`tsx
<div style={{ opacity: isPending ? 0.5 : 1 }}>
  {filteredResults.map(r => <ResultRow key={r.id} result={r} />)}
</div>
\`\`\`

**Difference from debounce:** debounce delays the update; \`startTransition\` starts it immediately but makes it interruptible.`,
  pros:[
    "Keeps input and other urgent UI responsive during heavy rendering",
    "isPending gives feedback without showing a full loading state"
  ],
  cons:[
    "Only helps when the bottleneck is rendering (too many React components to update) — doesn't help with slow API calls",
    "Requires React 18's concurrent renderer"
  ],
  useCase:
`A search box filtering a 50,000-item product list. Without transition: typing 'laptop' makes the input visibly lag as React re-renders thousands of rows on each keystroke. With transition: input is instant; the list updates between keystrokes.`,
  alts:[
    "What is useTransition and when should I use it?",
    "How is startTransition different from debouncing?",
    "What is isPending in useTransition?"
  ]
},

"react-typescript-43": {
  answer:
`**Next.js** is a full-stack framework with built-in rendering strategies. **Vite + React** is a client-side SPA setup with optional libraries for everything else.

| | Next.js | Vite + React |
|---|---|---|
| Rendering | SSR, SSG, ISR, RSC, streaming | CSR only (add Remix/TanStack Start for SSR) |
| Routing | File-based (App Router or Pages) | React Router, TanStack Router |
| Data fetching | Server-first (fetch in Server Components) | Client-first (React Query, SWR) |
| API routes | Built-in (/api/* or route handlers) | Need a separate backend |
| Bundle splitting | Automatic per page | Manual (React.lazy) |
| Complexity | Higher — more concepts to learn | Lower — just React |

**SSR:** HTML generated per request on the server. Good for pages with user-specific or frequently-changing data that need to be SEO-indexed.
**SSG:** HTML at build time. Fast, CDN-served. Good for docs, blogs, marketing pages.
**ISR:** Static pages that revalidate on a schedule (Next.js-specific). Best of SSG + SSR for semi-static content.

**My recommendation:** Next.js for public-facing pages, mixed auth/public apps, or when you need SSR/SSG. Vite+React for pure SPAs behind auth (where SSR doesn't help much) or for maximum simplicity.`,
  pros:[
    "Next.js SSG/ISR gives sub-100ms TTFB for marketing pages served from CDN",
    "Vite+React is simpler and faster to set up for SPAs with no public pages"
  ],
  cons:[
    "Next.js App Router has a steep learning curve (server vs client components, caching model)",
    "Vite SPA has poor SEO without additional effort"
  ],
  useCase:
`Euron's customer-facing help center (public, SEO-indexed) uses Next.js SSG — articles build at deploy time and serve from CDN. The agent dashboard (auth-gated, real-time) is a Vite SPA that loads React Query-powered data client-side.`,
  alts:[
    "When should I use Next.js vs Vite with React?",
    "What is the difference between SSR, SSG, and ISR?",
    "What rendering strategy should I use for a dashboard vs a marketing page?"
  ]
},

"react-typescript-44": {
  answer:
`React automatically escapes strings in JSX — \`{userInput}\` renders as text, never HTML. But several escape hatches break this protection.

**Main XSS vectors in React:**

1. **\`dangerouslySetInnerHTML\`:** bypasses escaping entirely.
\`\`\`tsx
// ✗ XSS if content comes from user input
<div dangerouslySetInnerHTML={{ __html: userContent }} />
// ✓ Sanitize first:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
\`\`\`

2. **\`javascript:\` URLs in href/src:**
\`\`\`tsx
// ✗ Clicking this executes the script
<a href={userProvidedUrl}>Link</a>
// ✓ Validate the protocol:
const safeUrl = /^https?:\/\//.test(url) ? url : '#';
\`\`\`

3. **Direct DOM manipulation via refs:** \`ref.current.innerHTML = value\` bypasses React — sanitize or avoid.

**Other hygiene:**
- Set \`Content-Security-Policy\` headers to block inline scripts and unauthorized sources
- Use HTTPS everywhere
- Set \`X-Content-Type-Options: nosniff\`
- Store tokens in \`httpOnly\` cookies, not \`localStorage\``,
  pros:[
    "React's auto-escaping covers the most common XSS vector by default",
    "DOMPurify is battle-tested and handles complex HTML sanitization"
  ],
  cons:[
    "dangerouslySetInnerHTML is sometimes necessary for rich text rendering — discipline required",
    "CSP headers must be carefully configured — too restrictive breaks the app; too loose is useless"
  ],
  useCase:
`A knowledge base that stores admin-authored HTML content. \`dangerouslySetInnerHTML\` is used to render it, but all content goes through DOMPurify on save (server-side) and again on render (client-side defense-in-depth). \`javascript:\` href is blocked by CSP.`,
  alts:[
    "How does React prevent XSS attacks?",
    "Is React safe from XSS by default?",
    "How do you safely render HTML in React?"
  ]
},

"react-typescript-45": {
  answer:
`**Token storage trade-offs:**

| Storage | XSS Risk | CSRF Risk | Notes |
|---|---|---|---|
| localStorage | High (JS-readable) | None (not auto-sent) | Don't store tokens here |
| sessionStorage | High | None | Same XSS risk as localStorage |
| httpOnly cookie | None (not JS-readable) | Yes (auto-sent) | Mitigate with SameSite + double-submit |
| Memory (variable) | Low (cleared on refresh) | None | Access token here; refresh token in httpOnly cookie |

**Recommended pattern:**
1. **Access token** in memory (module variable or React Context) — short-lived (15 min), cleared on refresh
2. **Refresh token** in \`httpOnly; SameSite=Strict; Secure\` cookie — longer-lived, not readable by JS
3. On app load: silently call \`/auth/refresh\` to exchange the cookie for a new access token
4. On 401 response: automatically call refresh → retry original request

\`\`\`ts
// api.ts — Axios interceptor
axiosInstance.interceptors.response.use(
  r => r,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await refreshAccessToken();   // updates in-memory token
      return axiosInstance(error.config);
    }
    return Promise.reject(error);
  }
);
\`\`\``,
  pros:[
    "httpOnly cookies can't be read by XSS malware — refresh token is safe",
    "In-memory access token is short-lived and clears on tab close"
  ],
  cons:[
    "In-memory token is lost on page refresh — requires a silent refresh on load",
    "httpOnly cookies require SameSite configuration to prevent CSRF"
  ],
  useCase:
`Agent logs in → server sets \`refresh_token\` in httpOnly cookie, returns \`access_token\` in response body. Client stores access token in memory. On refresh: silent call to \`/auth/refresh\` exchanges the cookie for a new access token. On tab close/refresh: memory clears; next load silently refreshes.`,
  alts:[
    "Where should I store JWT tokens in a React SPA?",
    "What is the difference between storing a token in localStorage vs a cookie?",
    "How do you implement token refresh in a React app?"
  ]
},

"react-typescript-46": {
  answer:
`**SCENARIO: 60 re-renders per keystroke in a search input.**

**Step 1 — Profile before fixing.** Open React DevTools Profiler, click Record, type a character. Find which components render, how many times, and what triggered them (highlighted in the "Why did this render?" pane).

**Common root causes and fixes:**

1. **Search state in a parent that has many expensive children.** Move the search input into its own isolated component. Debounce the search string before passing it down:
\`\`\`ts
const debouncedQuery = useDebounce(query, 300);
// Only pass debouncedQuery to the expensive filter/list
\`\`\`

2. **Filtered results recreated on every render.** Memoize:
\`\`\`ts
const results = useMemo(() => data.filter(d => d.name.includes(query)), [data, query]);
\`\`\`

3. **Every list item re-rendering.** Wrap the item component in \`React.memo\`.

4. **Search value in a shared Context.** Context re-renders all consumers. Move search state out of context or use Zustand with a selector.

**Fix order:** debounce (prevents expensive work) → memoize results → React.memo on items. Don't skip profiling — guessing at the cause wastes time.`,
  alts:[
    "How do you debug a React component that re-renders too many times?",
    "How do you optimize a search input in React?",
    "What tools can I use to profile React rendering performance?"
  ]
},

"react-typescript-47": {
  answer:
`**SCENARIO: White screen on certain pages after deploy.**

This is almost always a code-splitting / lazy loading failure.

**Debug steps:**

1. **Browser DevTools → Console:** look for \`ChunkLoadError\`, "Loading chunk N failed", or \`SyntaxError\` from a malformed chunk.
2. **Network tab:** filter by JS. Look for 4xx or 5xx responses on \`.js\` chunk files.
3. **Application tab → Service Workers:** a stale service worker may be serving old chunk references that no longer exist.

**Root causes:**

- **Stale HTML + deleted chunks:** the user's browser has a cached \`index.html\` pointing to old chunk filenames. New deploy deleted those files. Fix: serve HTML with \`Cache-Control: no-cache, no-store\`; use content-hashed filenames for JS/CSS bundles.

- **Error inside a lazy-loaded module:** the chunk loads fine but the module throws during evaluation. The error boundary catches it as a render error, but only if you have one wrapping the \`Suspense\`.

- **Race condition on deploy:** user navigates during a rolling deploy; old and new assets are mixed. Fix: either block navigation during deploy or implement versioned chunk paths.

**Hardening:**
\`\`\`ts
window.addEventListener('unhandledrejection', e => {
  if (e.reason?.name === 'ChunkLoadError') window.location.reload();
});
\`\`\`
A reload fetches the new \`index.html\` with correct chunk references.`,
  alts:[
    "Why do I get a white screen after deploying a React app?",
    "What is a ChunkLoadError in React?",
    "How do you prevent chunk loading failures in a React SPA?"
  ]
},

"react-typescript-48": {
  answer:
`**SCENARIO: Real-time dashboard with 50 metrics updating at 1Hz via WebSocket.**

At 50 updates/second, the challenge is preventing unnecessary re-renders — React can't re-render 50 components 50 times per second without janking.

**Architecture:**

1. **Single WebSocket connection** managed in a module-level singleton or \`useWebSocket\` hook. Parses incoming messages and updates a store.

2. **Zustand store with per-metric selectors:**
\`\`\`ts
const useMetricsStore = create<{ metrics: Record<string, MetricData> }>(set => ({
  metrics: {},
  update: (id: string, data: MetricData) =>
    set(s => ({ metrics: { ...s.metrics, [id]: data } }))
}));

// Each widget subscribes only to its metric:
const MetricWidget = ({ id }: { id: string }) => {
  const metric = useMetricsStore(s => s.metrics[id]);
  return <Chart data={metric} />;
};
\`\`\`
Only the specific widget re-renders when its metric changes.

3. **Throttle at ingestion:** if WebSocket fires faster than 60fps, batch updates:
\`\`\`ts
const updates: Record<string, MetricData> = {};
ws.onmessage = (e) => { updates[e.data.id] = e.data; };
setInterval(() => { store.batchUpdate(updates); Object.keys(updates).forEach(k => delete updates[k]); }, 16);
\`\`\`

4. **Canvas charts via ref:** Update \`Chart.js\` or similar imperatively to bypass React's render cycle for pixel updates.`,
  alts:[
    "How do you manage state for a real-time WebSocket dashboard in React?",
    "How do you prevent re-renders with frequent data updates in React?",
    "How do you use Zustand with WebSocket data in React?"
  ]
},

"react-typescript-49": {
  answer:
`**SCENARIO: Design a data-fetching layer for 200+ API calls with React Query.**

**Structure:**
\`\`\`
src/
  lib/
    api-client.ts       # axios instance: base URL, auth header, error handling
    query-client.ts     # global QueryClient config
  hooks/
    use-tickets.ts      # useTickets, useTicket, useCreateTicket, useResolveTicket
    use-conversations.ts
    use-knowledge.ts
\`\`\`

**Query key conventions** — hierarchical and consistent:
\`\`\`ts
const keys = {
  tickets: {
    all: ['tickets'] as const,
    list: (filters: TicketFilters) => ['tickets', 'list', filters] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
  }
};
\`\`\`
\`invalidateQueries({ queryKey: keys.tickets.all })\` invalidates all ticket queries at once.

**QueryClient defaults:**
\`\`\`ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
    }
  }
});
\`\`\`

**Error handling** centralized in the API client — normalize errors before React Query sees them. Per-hook overrides for specific retry logic.

**Optimistic updates** on mutations — update cache immediately, roll back on error.`,
  alts:[
    "How do you organize React Query for a large application with many endpoints?",
    "What are query key conventions in React Query?",
    "How do you configure global defaults in React Query?"
  ]
},

"react-typescript-50": {
  answer:
`**SCENARIO: Migrate 150 components to TypeScript strict mode.**

Don't enable \`"strict": true\` globally on day one — you'll get thousands of errors and block CI.

**Incremental strategy:**

1. **Assess scope first:** \`npx tsc --strict --noEmit 2>&1 | grep "error TS" | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -20\` — shows which files have the most errors. Fix high-error files first for the biggest bang.

2. **Add \`// @ts-nocheck\` to every file** using \`ts-migrate\` or a script. All files compile; CI stays green. Then remove it file by file.

3. **Enable strict per-directory** using tsconfig path references — migrate \`components/ui/\` fully before \`legacy/\`:
\`\`\`json
{ "extends": "../../tsconfig.json", "compilerOptions": { "strict": true } }
\`\`\`

4. **Common fixes by error:**
   - \`strictNullChecks\`: add \`?.\ optional chaining or type guards
   - \`noImplicitAny\`: add explicit parameter types
   - \`strictFunctionTypes\`: fix callback covariance issues

5. **Block regressions in CI:** \`tsc --strict --noEmit 2>&1 | grep "error TS" | wc -l\` — fail the build if the count increases.

6. **Timeline:** one module per sprint alongside features — don't sacrifice velocity for a big-bang migration.`,
  alts:[
    "How do you migrate a large React codebase to TypeScript strict mode?",
    "What errors does TypeScript strict mode add?",
    "How do you enable TypeScript strict mode incrementally?"
  ]
}
