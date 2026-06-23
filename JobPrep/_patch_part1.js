// PATCH PART 1: react-typescript-1 through react-typescript-25
"react-typescript-1": {
  answer:
`The **Virtual DOM** is React's in-memory representation of the real DOM. On every render, React builds a new virtual DOM tree, diffs it against the previous one, and applies only the necessary real DOM changes (a process called **reconciliation**). Touching the real DOM is expensive; the diff is cheap.

**Fiber** (React 16+) rewrote the reconciler. Instead of a synchronous recursive call stack, it models the work-to-do as a linked list of "fiber nodes" — each one a unit of work. This allows React to:
- Pause, resume, or abort rendering mid-way (no more "dropped frames" on heavy renders)
- Prioritize urgent updates (a keystroke) over low-priority ones (a data refresh)
- Enable **Concurrent Mode** and features like Suspense, useTransition, and streaming SSR

The diff algorithm uses two key O(n) heuristics:
1. Elements of different types always produce different trees (no deep comparison)
2. The \`key\` prop tells React which list items map to which across renders`,
  pros:[
    "DOM operations batched and minimized — only real differences applied",
    "Fiber enables prioritized, interruptible rendering (Concurrent Mode)",
    "Synchronous diff against in-memory tree is cheap compared to real DOM queries"
  ],
  cons:[
    "Extra layer of abstraction — the vdom itself takes memory",
    "Can be slower than direct DOM manipulation for very simple, infrequent updates",
    "Fiber's complexity makes debugging low-level rendering behavior hard"
  ],
  useCase:
`A messaging app renders a list of 500 messages. User edits a draft at the bottom. React diffs the new vdom against the old — only the single changed message text node gets updated in the real DOM. Without vdom, you'd need to know exactly which DOM nodes to touch, or re-render everything.`,
  alts:[
    "How does React's reconciliation algorithm work?",
    "What did Fiber change about how React renders?",
    "Why does React use a virtual DOM instead of updating the real DOM directly?"
  ]
},

"react-typescript-2": {
  answer:
`Functional components don't have lifecycle methods — they have **hooks that synchronize with the render cycle**.

**Mount:** function runs → React commits DOM → browser paints → \`useEffect(fn, [])\` fires (async, after paint).

**Update:** state or prop changes → function re-runs → React diffs and patches DOM → cleanup of previous effect runs → new \`useEffect(fn, [deps])\` fires (if deps changed).

**Unmount:** cleanup function returned from \`useEffect\` runs. This is your unsubscribe / clearTimeout / cancel.

\`\`\`ts
useEffect(() => {
  const sub = ws.subscribe(id, handler);   // on mount / id change
  return () => sub.unsubscribe();          // on unmount / before next effect
}, [id]);
\`\`\`

The right mental model: **effects synchronize with external systems**, not with lifecycle events. Ask "what do I need to keep in sync?" not "what should I do on mount?"`,
  pros:[
    "One mental model (sync) instead of three lifecycle methods",
    "Cleanup is colocated with setup — harder to forget",
    "Custom hooks extract and reuse lifecycle logic without HOCs"
  ],
  cons:[
    "Dependency array mistakes (stale closure, missing dep) are common errors",
    "Mapping old componentDidUpdate patterns to useEffect isn't always obvious",
    "useLayoutEffect adds synchronous paint-blocking if misused"
  ],
  useCase:
`A chat window subscribes to WebSocket messages for a given \`conversationId\`. When the user navigates to a different conversation, the cleanup function unsubscribes from the old one, and the effect re-runs to subscribe to the new one. All in one \`useEffect([conversationId])\`.`,
  alts:[
    "What replaces componentDidMount, componentDidUpdate, and componentWillUnmount in hooks?",
    "How do you run code on mount and clean up on unmount with hooks?",
    "What is the correct mental model for useEffect?"
  ]
},

"react-typescript-3": {
  answer:
`JSX is syntactic sugar — it is not valid JavaScript and never runs in the browser as-is. The build tool (Babel, TypeScript, SWC) transforms it before runtime.

**Classic transform (pre-React 17):**
\`<Button color="blue">Click</Button>\` → \`React.createElement(Button, {color:"blue"}, "Click")\`
Required \`import React from 'react'\` in every file (even if never referenced directly).

**Automatic transform (React 17+):**
The compiler injects an import from \`react/jsx-runtime\` automatically. You no longer need the explicit React import. The generated call is \`_jsx(Button, {color:"blue", children:"Click"})\`.

Under the hood, \`createElement\` / \`_jsx\` returns a plain object:
\`{type: Button, props: {color:"blue", children:"Click"}, key: null, ref: null}\`
That's what React's reconciler works with — a lightweight description, not a real DOM node.`,
  pros:[
    "Declarative UI that looks like HTML is far more readable than nested createElement calls",
    "TypeScript type-checks JSX — wrong prop types or missing required props are caught at compile time",
    "Automatic transform eliminates the boilerplate React import"
  ],
  cons:[
    "Requires a build step — can't run JSX directly in a browser",
    "New developers sometimes think JSX is HTML or a template engine — it's JavaScript"
  ],
  useCase:
`Setting \`"jsx": "react-jsx"\` in tsconfig.json enables the automatic transform for a TypeScript project — no more adding \`import React from 'react'\` to every new file. The compiler handles it.`,
  alts:[
    "What does the JSX transform actually produce?",
    "Why did you need to import React in every file before React 17?",
    "What is React.createElement and when does it get called?"
  ]
},

"react-typescript-4": {
  answer:
`Functionally they're equivalent — both render UI and can hold state. The reason hooks won:

**Class problems:**
- \`this\` binding: \`this.handleClick = this.handleClick.bind(this)\` in the constructor, or arrow function class fields — both awkward.
- Logic split across lifecycle methods: a WebSocket subscription set up in \`componentDidMount\`, updated in \`componentDidUpdate\`, torn down in \`componentWillUnmount\` — three places for one concern.
- Code reuse required HOCs or render props, which both add nesting and prop name conflicts.

**Hooks solutions:**
- No \`this\` — functions close over variables naturally.
- Related logic colocated in one \`useEffect\`.
- Custom hooks extract and reuse stateful logic without wrapper hell. \`useWebSocket\` is a reusable hook; a HOC version would require wrapping every consumer.

**Still use class components for:** Error Boundaries (no hook equivalent yet).`,
  pros:[
    "No this binding confusion — functions are simpler to reason about",
    "Custom hooks compose cleanly; HOCs add wrapper nesting and prop collisions",
    "Smaller bundles — class syntax has more overhead than plain functions"
  ],
  cons:[
    "Hooks have rules (top-level only, React functions only) that class methods don't",
    "Stale closure bugs in useEffect/useCallback are a new class of error",
    "Error Boundaries still require class components"
  ],
  useCase:
`Before hooks, a \`withAuth\` HOC, a \`withData\` HOC, and a \`withTheme\` HOC stacked three layers of wrapper components in DevTools. With hooks, the same component calls \`useAuth()\`, \`useData()\`, and \`useTheme()\` in its function body — flat, readable, independently testable.`,
  alts:[
    "Why did React introduce hooks if class components worked?",
    "What problems do hooks solve that class components couldn't?",
    "When would you still write a class component today?"
  ]
},

"react-typescript-5": {
  answer:
`Three subtleties that come up in interviews:

**Batching (React 18):** Multiple \`setState\` calls in the same event handler — or even inside \`setTimeout\` / Promises / native events — are batched into a single re-render. Pre-18, only React synthetic event handlers were batched.

**Functional updates:** When next state depends on current state, always use the function form:
\`\`\`ts
setCount(c => c + 1); // safe — callback gets the latest state
// NOT: setCount(count + 1) — 'count' may be stale in async/closure context
\`\`\`
Classic example: a \`setInterval\` that uses \`count\` from the closure captures its value at the time the effect ran. The functional update \`c => c + 1\` gets the fresh value from React.

**Lazy initialization:**
\`\`\`ts
const [state, setState] = useState(() => computeExpensiveInitialValue());
// ✓ The function runs only on mount
// ✗ useState(computeExpensiveInitialValue()) — runs on every render (result discarded after mount)
\`\`\``,
  pros:[
    "Simple API — one function for read and update",
    "Batching in React 18 reduces render count with no code change",
    "Lazy init avoids running expensive setup on every render"
  ],
  cons:[
    "State is replaced, not merged (unlike class component this.setState) — easy to accidentally drop keys from object state",
    "Stale closure in async code is a common bug when not using functional updates"
  ],
  useCase:
`A counter that increments on each interval tick: \`useEffect(() => { const id = setInterval(() => setCount(c => c + 1), 1000); return () => clearInterval(id); }, [])\`. The empty dep array means the callback is created once and never replaced — functional update ensures it always reads the latest count.`,
  alts:[
    "What is the difference between setCount(count + 1) and setCount(c => c + 1)?",
    "How does React 18 change state batching?",
    "What is lazy initialization in useState and why does it matter?"
  ]
},

"react-typescript-6": {
  answer:
`\`useEffect\` runs after render, asynchronously (after the browser paints). The dependency array controls when it re-runs:
- \`[]\` — once after the initial mount
- \`[a, b]\` — after mount and when \`a\` or \`b\` changes (shallow comparison)
- omitted — after every render (almost never correct)

**Three common mistakes:**

1. **Missing deps (stale closure):** The effect captures variables at the time it's created. If you use \`userId\` inside but don't list it as a dep, the effect always sees the original \`userId\`. Fix: add it to deps, or use a ref if you intentionally don't want re-runs.

2. **Infinite loop:** \`useEffect(() => setX(calc(x)), [x])\` — the effect changes \`x\`, which re-triggers the effect. Fix: restructure so the computation doesn't change the dep.

3. **Missing cleanup:** Event listeners, WebSocket subscriptions, and intervals leak if you don't return a cleanup function.

\`\`\`ts
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(r => r.json()).then(setData);
  return () => controller.abort(); // cleanup cancels the in-flight request
}, [url]);
\`\`\``,
  pros:[
    "Declarative — describe what to sync, not when",
    "Cleanup colocated with setup — the effect is self-contained",
    "Dependency array makes the trigger conditions explicit and auditable"
  ],
  cons:[
    "Dependency array rules are unintuitive until the mental model clicks",
    "Objects/functions as deps cause infinite loops unless memoized",
    "Runs after paint — not suitable for measurements before paint (use useLayoutEffect)"
  ],
  useCase:
`A ticket detail page fetches ticket data when the \`ticketId\` route param changes. \`useEffect(() => { fetchTicket(ticketId).then(setTicket); }, [ticketId])\`. Adding \`AbortController\` in the cleanup ensures navigating quickly between tickets doesn't show stale data from a slow previous request.`,
  alts:[
    "Why is my useEffect running in an infinite loop?",
    "How do you cancel a fetch request when a component unmounts?",
    "What's the difference between useEffect with [] vs with deps vs with no array?"
  ]
},

"react-typescript-7": {
  answer:
`Both memoize across renders; the difference is *what* they memoize:
- \`useMemo(fn, deps)\` → memoizes the **return value** of \`fn\`
- \`useCallback(fn, deps)\` → memoizes the **function reference** itself

\`useCallback(fn, deps)\` is literally shorthand for \`useMemo(() => fn, deps)\`.

**When do they actually prevent re-renders?**
Only when the memoized value is passed to a child wrapped in \`React.memo\`. Without \`React.memo\` on the receiving component, the parent re-renders anyway and the memoization achieves nothing for child render prevention.

\`\`\`ts
// Only useful if ExpensiveList is wrapped in React.memo
const sorted = useMemo(() => heavySort(data), [data]);
const handleSelect = useCallback((id) => setSelected(id), []);
return <ExpensiveList items={sorted} onSelect={handleSelect} />;
\`\`\`

**Don't over-memoize.** Both hooks have overhead (dep comparison every render). Use them when:
- A heavy computation sits inside the hook
- The value/function goes to a \`React.memo\`-wrapped child
- The function is a dep of another \`useEffect\`/\`useMemo\``,
  pros:[
    "Prevents expensive recomputation when inputs haven't changed",
    "Stable function references stop React.memo'd children from re-rendering unnecessarily"
  ],
  cons:[
    "Overhead on every render for dep comparison — often not worth it",
    "Premature memoization adds complexity with no benefit; profile first",
    "useCallback doesn't prevent re-renders on its own — the child must be React.memo'd"
  ],
  useCase:
`An analytics dashboard renders a large filtered+sorted table. The filter/sort is CPU-heavy. \`useMemo\` on the computed rows means re-renders triggered by unrelated state (e.g., a tooltip hover) don't redo the computation. The rows object is also stable, so the \`React.memo\`-wrapped \`DataTable\` doesn't re-render either.`,
  alts:[
    "What is the difference between useMemo and useCallback?",
    "Does useCallback by itself prevent child re-renders?",
    "When should I actually use useMemo vs just computing inline?"
  ]
},

"react-typescript-8": {
  answer:
`\`useRef\` returns a stable object \`{ current: initialValue }\` that persists across renders. Mutating \`.current\` does **not** trigger a re-render.

**Two use cases:**

1. **DOM access:**
\`\`\`ts
const inputRef = useRef<HTMLInputElement>(null);
// After mount:
inputRef.current?.focus();
\`\`\`
React populates \`ref.current\` after the DOM node mounts. Useful for focus management, measuring dimensions, triggering imperative animations.

2. **Mutable value without re-render:**
\`\`\`ts
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
timerRef.current = setTimeout(fn, 300); // store timer ID
clearTimeout(timerRef.current);         // cancel it later
\`\`\`
Also used to: store the previous value of a prop, track whether it's the first render, hold a WebSocket instance that shouldn't live in state.

**Key distinction:** state triggers re-renders, refs don't. If you need the UI to reflect a value change, use state. If you need to *remember* something across renders without causing a re-render, use a ref.`,
  pros:[
    "Direct DOM access without going outside React's model",
    "Mutable container for non-rendering values — no stale closure like state"
  ],
  cons:[
    "Ref changes aren't tracked by React — you can't use ref.current in JSX expecting it to stay in sync",
    "Callback refs are needed to respond to when a ref is attached/detached"
  ],
  useCase:
`An autosave feature debounces with a timer: the timer ID lives in a ref so canceling/restarting it doesn't trigger re-renders. The actual \`lastSaved\` timestamp that appears in the UI lives in state.`,
  alts:[
    "What's the difference between useRef and useState?",
    "How do you access a DOM element in React?",
    "When would you store something in a ref instead of state?"
  ]
},

"react-typescript-9": {
  answer:
`Context is a way to pass data through the component tree without passing props at every level. A Provider sets a value; any descendant calls \`useContext(MyContext)\` to read it.

\`\`\`tsx
const ThemeContext = createContext<'light'|'dark'>('light');
// Wrap the tree:
<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
// Read anywhere inside:
const theme = useContext(ThemeContext);
\`\`\`

**When to use each option:**
- **Prop drilling (2-3 levels):** just pass props — explicit, simple, no overhead
- **Context:** slow-changing global values (current user, locale, theme). Caution: every consumer re-renders when the context value changes. Don't put fast-changing state (e.g., scroll position) in context.
- **Zustand / Redux:** many disconnected components need frequently-changing shared state. Fine-grained subscriptions — components only re-render when the slice they care about changes.

**Context is a transport, not a state manager.** It solves "how do I get this value to deeply nested components?" not "how do I manage complex shared state?"`,
  pros:[
    "Built-in, zero dependencies — great for slow-changing values",
    "Simple to set up compared to a full state library"
  ],
  cons:[
    "All consumers re-render on any value change — no fine-grained subscriptions",
    "Value identity matters: passing a new object reference each render re-renders all consumers"
  ],
  useCase:
`The logged-in user object is fetched once on app load and read by the sidebar, the avatar, and the admin guard. Placing it in a UserContext means none of those components need the user passed as a prop. User data changes only on login/logout — so the re-render-all-consumers cost is negligible.`,
  alts:[
    "What is React Context and when should you not use it?",
    "What's the performance concern with useContext?",
    "When would you use Context vs Redux vs Zustand?"
  ]
},

"react-typescript-10": {
  answer:
`\`useReducer\` is \`useState\` with a pure function in between:
\`\`\`ts
const [state, dispatch] = useReducer(reducer, initialState);
// reducer: (state, action) => newState
\`\`\`

**Prefer \`useReducer\` over \`useState\` when:**
- Multiple state fields that change together: updating status + data + error on a fetch is three \`setState\` calls; a reducer makes it one dispatch with a clear intent.
- Complex state transitions: the reducer is a pure function — easy to unit test in isolation with no DOM.
- Next state depends on current state in non-trivial ways: the reducer always receives the current state, no stale closure risk.
- You want the "action dispatch" vocabulary to make intent clear: \`dispatch({ type: 'TICKET_RESOLVED', payload: id })\` reads like a domain event.

**Stick with \`useState\` for:** independent scalar values (\`isOpen\`, \`count\`, \`searchQuery\`).

The dividing line: if you'd write 3+ \`setState\` calls that logically belong together, or if you'd benefit from testable state machine logic, reach for \`useReducer\`.`,
  pros:[
    "Reducer is a pure function — trivially unit testable",
    "Dispatch actions have named intents — the call site is self-documenting",
    "State transitions are colocated in one place, not scattered across handlers"
  ],
  cons:[
    "More boilerplate than useState for simple cases",
    "action type strings can diverge between dispatch calls and the reducer (use TypeScript discriminated unions to fix)"
  ],
  useCase:
`A multi-step form with \`{ step, formData, validationErrors, isSubmitting }\` — these fields change together at each step transition. A reducer with \`NEXT_STEP\`, \`PREV_STEP\`, \`SET_FIELD\`, \`SUBMIT_START\`, \`SUBMIT_SUCCESS\`, \`SUBMIT_ERROR\` actions makes every transition explicit and testable.`,
  alts:[
    "When should I use useReducer instead of useState?",
    "How is useReducer like Redux?",
    "What's a good example where useReducer is better than useState?"
  ]
},

"react-typescript-11": {
  answer:
`A custom hook is any function prefixed with \`use\` that can call other hooks. It extracts reusable stateful logic without adding component nesting.

\`\`\`ts
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(url).then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);
  return { data, loading, error };
}
\`\`\`

Key insight: custom hooks share **logic**, not **state**. Each component that calls \`useCounter()\` gets its own independent counter.`,
  pros:[
    "Extract and reuse complex stateful logic without HOC wrapper nesting",
    "Testable in isolation via renderHook",
    "Co-locates setup, state, and cleanup into a named, single-purpose module"
  ],
  cons:[
    "Must follow Rules of Hooks (top-level only, React functions only)",
    "Poor naming (missing 'use' prefix) breaks the linting rules silently"
  ],
  useCase:
`\`useWebSocket(conversationId)\` encapsulates the WebSocket setup, message parsing, reconnect logic, and cleanup. Every chat component calls one hook instead of duplicating 30 lines of useEffect.`,
  alts:[
    "How do you share stateful logic between components?",
    "What is the difference between a custom hook and a utility function?",
    "Can two components share state via a custom hook?"
  ]
},

"react-typescript-12": {
  answer:
`Both run after DOM mutations, but at different times relative to the browser paint:

| | \`useEffect\` | \`useLayoutEffect\` |
|---|---|---|
| Fires | After the browser paints | Before the browser paints (synchronous) |
| Blocks paint | No | Yes |
| Use for | Most side effects (fetch, subscriptions) | DOM measurements + sync corrections |

**When to use \`useLayoutEffect\`:** You need to read DOM dimensions or positions and immediately update something so the user never sees an intermediate state — e.g., measuring a dropdown menu's position relative to the viewport before it appears, or calculating a tooltip position.

\`\`\`ts
useLayoutEffect(() => {
  const rect = triggerRef.current.getBoundingClientRect();
  setTooltipPosition({ top: rect.bottom, left: rect.left });
}, []);
\`\`\`

If you use \`useEffect\` for this, the user sees a brief layout jump (element renders in wrong position → moves). \`useLayoutEffect\` prevents it by running before paint.

**Default to \`useEffect\`.** \`useLayoutEffect\` blocks the paint and defeats concurrency.`,
  pros:[
    "useLayoutEffect eliminates visible layout jumps for DOM-measurement-driven UI",
    "useEffect doesn't block paint — better performance for most cases"
  ],
  cons:[
    "useLayoutEffect can cause performance issues if it does heavy work before each paint",
    "useLayoutEffect runs synchronously — if it throws, the browser never paints"
  ],
  useCase:
`A popover component that must appear above the trigger button when there's no room below. \`useLayoutEffect\` reads the trigger's \`getBoundingClientRect()\` and sets the position before the first paint — no flicker.`,
  alts:[
    "What is the difference between useEffect and useLayoutEffect?",
    "When do you use useLayoutEffect over useEffect?",
    "Why would useLayoutEffect cause performance issues?"
  ]
},

"react-typescript-13": {
  answer:
`**Context API:** Built-in, no library. Pass stable values (theme, locale, current user). Weakness: all consumers re-render on any change — no fine-grained subscriptions.

**Redux (+ RTK):** Predictable, centralized store. Great for complex apps needing middleware (logging, analytics, saga), time-travel debugging, or many actors writing to shared state. Boilerplate, but RTK tames it significantly.

**Zustand:** Minimal API, fine-grained subscriptions, no boilerplate, works outside React (for testing, vanilla JS). Components subscribe to slices: \`const tickets = useStore(s => s.tickets)\` — only re-renders if \`tickets\` changes.

**Recoil:** Atomic state — each atom is independently subscribed. Good for derived state graphs (selectors). Heavier bundle, maintained by Meta.

**My default recommendation:**
- Slow-changing global values → Context
- Most apps → **Zustand** (simple, performant, great TypeScript DX)
- Large teams with complex async flows → **Redux + RTK** (middleware, devtools, established patterns)
- Atom-based derived state → Recoil / Jotai`,
  pros:[
    "Zustand: tiny, fine-grained subs, easy to use outside components (testing, services)",
    "Redux: exceptional devtools and middleware ecosystem",
    "Context: zero dependencies for simple cases"
  ],
  cons:[
    "Context re-renders all consumers on change — bad for frequent updates",
    "Redux has boilerplate and a learning curve even with RTK",
    "Recoil bundle size and stability concerns for production"
  ],
  useCase:
`A support platform: Zustand stores the active conversation and ticket list (frequent updates, many subscribers). Context holds the current user (rarely changes). RTK Query handles API data fetching with caching. Each tool does what it's good at.`,
  alts:[
    "When would you use Redux over Zustand?",
    "Why is Context API not a replacement for Redux?",
    "What state management library would you choose for a new React project?"
  ]
},

"react-typescript-14": {
  answer:
`Redux Toolkit (RTK) is the official opinionated Redux setup that eliminates the boilerplate.

**\`createSlice\`:** defines state, reducers, and action creators in one place. Uses Immer under the hood — you can write "mutating" logic that's actually safe.
\`\`\`ts
const ticketSlice = createSlice({
  name: 'tickets',
  initialState: [] as Ticket[],
  reducers: {
    ticketAdded: (state, action: PayloadAction<Ticket>) => { state.push(action.payload); },
    ticketResolved: (state, action: PayloadAction<string>) => {
      const t = state.find(t => t.id === action.payload);
      if (t) t.status = 'resolved';
    }
  }
});
export const { ticketAdded, ticketResolved } = ticketSlice.actions;
\`\`\`

**\`createAsyncThunk\`:** generates pending/fulfilled/rejected action types for async operations:
\`\`\`ts
const fetchTickets = createAsyncThunk('tickets/fetch', async () =>
  await api.get('/tickets').then(r => r.data)
);
\`\`\`

**RTK Query:** built-in data fetching and caching — like React Query but integrated with Redux:
\`\`\`ts
const ticketsApi = createApi({
  reducerPath: 'ticketsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (build) => ({
    getTickets: build.query<Ticket[], void>({ query: () => '/tickets' }),
  })
});
export const { useGetTicketsQuery } = ticketsApi;
\`\`\``,
  pros:[
    "createSlice eliminates action type constants and switch statements",
    "Immer makes immutable updates readable",
    "RTK Query handles caching, deduplication, and loading state like React Query but in Redux"
  ],
  cons:[
    "RTK Query adds another API data layer on top of Redux — can overlap with React Query if both are used",
    "Still more boilerplate than Zustand for simple use cases"
  ],
  useCase:
`An agent dashboard uses \`createSlice\` for local UI state (selected ticket, sidebar open/closed), \`createAsyncThunk\` for one-off operations, and RTK Query for all API data fetching. The Redux DevTools show every action and state snapshot — invaluable for debugging ticket status transitions.`,
  alts:[
    "What does Redux Toolkit fix compared to plain Redux?",
    "How does createSlice work?",
    "What is RTK Query and how does it compare to React Query?"
  ]
},

"react-typescript-15": {
  answer:
`**Prop drilling** is passing props through intermediate components that don't use them, just to deliver them to a deeply nested child.

**Three solutions:**

**1. Context API:** Wrap the subtree in a Provider; deep descendants read via \`useContext\`. Best for: stable values read by many components (user, theme, locale).

**2. Component Composition:** Pass JSX as \`children\` or render props so middle layers never see the data at all:
\`\`\`tsx
// Instead of: <Layout user={user}><Header user={user}><Avatar user={user}/></Header></Layout>
// Do: <Layout><Header><Avatar user={user}/></Header></Layout>
// Layout and Header receive the pre-composed JSX; they don't need user
\`\`\`
Underused. Often the cleanest fix — restructure *who renders what* rather than where state lives.

**3. State management library (Zustand, Redux):** Components access shared state directly from the store. Best for: frequently-changing state accessed by many disconnected components.

**My take:** try composition first (it's free and often sufficient), then Context for stable global values, then a library for complex/frequent-change cases.`,
  pros:[
    "Composition often eliminates the need for any state management library",
    "Context is zero-dependency for stable values",
    "Zustand's direct store access is the most flexible for disconnected components"
  ],
  cons:[
    "Context re-renders all consumers on value change",
    "Over-using global state makes component reuse harder (implicit dependencies)",
    "Composition can feel unnatural until you internalize the pattern"
  ],
  useCase:
`A \`<Page user={user}>\` passes user to \`<Sidebar user={user}>\` which passes it to \`<UserMenu user={user}>\`. Refactoring to \`<Page><Sidebar><UserMenu user={user}/></Sidebar></Page>\` eliminates the prop from two intermediate components. No Context needed.`,
  alts:[
    "What is prop drilling and why is it a problem?",
    "How does component composition avoid prop drilling?",
    "When should I use Context vs just drilling props?"
  ]
},

"react-typescript-16": {
  answer:
`**Identify first:** React DevTools Profiler → record an interaction → see which components rendered, how long they took, and *why* (which prop/state changed).

**Common causes and fixes:**

1. **Parent re-renders all children:** Wrap expensive pure children in \`React.memo\`. Check that props passed to them are stable (memoize objects/functions).

2. **New object/array created on every render:**
\`\`\`tsx
// ✗ New array every render → child always re-renders
<List items={data.filter(d => d.active)} />
// ✓
const active = useMemo(() => data.filter(d => d.active), [data]);
<List items={active} />
\`\`\`

3. **State too high:** A counter in a top-level component re-renders the entire tree. Move state as close to where it's used as possible.

4. **Context with fast-changing values:** Split context — put stable values in one context, volatile values in another. Or replace with Zustand selectors.

5. **Key instability:** Using array index as key causes React to remount on reorder.`,
  pros:[
    "DevTools Profiler gives concrete evidence before you guess at fixes",
    "State colocation (lowest necessary ancestor) is often the best fix with no extra libraries"
  ],
  cons:[
    "React.memo adds a shallow comparison on every render — can hurt more than help for cheap components",
    "Over-memoizing creates stale closure bugs and makes code harder to read"
  ],
  useCase:
`A search results page re-renders 200 result cards on every keystroke because \`results\` is a new array each time (even with the same contents). \`useMemo\` on the filtered array + \`React.memo\` on the card component drops re-renders from 200 to 0 for unchanged cards.`,
  alts:[
    "How do you identify unnecessary re-renders in React?",
    "Why does my child component re-render even when its props don't change?",
    "What is the React DevTools Profiler and how do you use it?"
  ]
},

"react-typescript-17": {
  answer:
`Three tools that work together:

**\`React.memo(Component)\`:** Skips re-rendering the component if props haven't changed (shallow comparison). Wrap expensive, pure child components.

**\`useMemo(fn, deps)\`:** Memoizes an expensive computed value. Returns the cached value if deps haven't changed.

**\`useCallback(fn, deps)\`:** Memoizes a function reference. Useful when the function is passed to a \`React.memo\`-wrapped child or lives in a \`useEffect\` dep array.

**The rule:** \`React.memo\` is the gate; the other two provide stable inputs to pass through it.
\`\`\`tsx
const ExpensiveTable = React.memo(({ rows, onSelect }) => { ... });

function Parent({ rawData }) {
  const rows = useMemo(() => transform(rawData), [rawData]);
  const handleSelect = useCallback((id) => doSomething(id), []);
  return <ExpensiveTable rows={rows} onSelect={handleSelect} />;
}
\`\`\`

**Don't memo everything.** Run the profiler first. Most components are fast enough that the memoization overhead isn't worth it.`,
  pros:[
    "Can dramatically reduce render count for expensive subtrees",
    "useCallback creates stable function references that don't invalidate useEffect unnecessarily"
  ],
  cons:[
    "Each useMemo/useCallback runs a dep comparison every render — small cost that adds up",
    "Premature memoization obscures bugs and adds cognitive load"
  ],
  useCase:
`A data grid with 1000 rows and sortable columns. The sort is \`useMemo\`-d over raw data. The row click handler is \`useCallback\`-d. The row component is \`React.memo\`-d. Result: only changed cells re-render on a sort.`,
  alts:[
    "What is the difference between React.memo, useMemo, and useCallback?",
    "When should I use React.memo?",
    "Does useMemo prevent re-renders?"
  ]
},

"react-typescript-18": {
  answer:
`**Code splitting** splits your JS bundle so users only download what they need for the current page/view.

**\`React.lazy\` + \`Suspense\`:**
\`\`\`tsx
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart />
    </Suspense>
  );
}
\`\`\`
The \`import()\` is dynamic — Vite/webpack creates a separate chunk for \`HeavyChart\`. It downloads only when the component is first rendered.

**Route-level splitting** (most impactful):
\`\`\`tsx
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const TicketList = React.lazy(() => import('./pages/TicketList'));
\`\`\`
Users on the customer-facing pages never download the admin bundle.

**Library splitting:** \`import { merge } from 'lodash-es'\` instead of \`import _ from 'lodash'\` — tree-shaking removes unused code at build time.

Next.js does route-level splitting automatically. In Vite+React you set it up manually at the router level.`,
  pros:[
    "Faster initial page load — ship only what's needed for the current view",
    "Large, rarely-used features (admin panels, PDF export) never load for most users"
  ],
  cons:[
    "Lazy-loaded chunks add a waterfall if not preloaded — there's a loading delay on first render",
    "Too many small chunks can hurt HTTP/1.1 performance (less of an issue with HTTP/2)"
  ],
  useCase:
`An app with a heavy D3 chart only shown to admins. Without splitting, every user downloads the D3 bundle. With \`React.lazy\`, regular users never hit that code. Admin bundle loads only when an admin navigates to the dashboard.`,
  alts:[
    "What is React.lazy and how does it work?",
    "How do you implement route-based code splitting in React?",
    "What is the Suspense fallback for in lazy loading?"
  ]
},

"react-typescript-19": {
  answer:
`The \`key\` prop is React's identity signal for list items. React assumes: **same position + same key = same element (update it in-place)**. Different key = destroy the old element, create a new one.

**Without keys (or with wrong keys):** React guesses based on position — the first element is always "the same first element," even if items were reordered.

**Why index-as-key is dangerous:**
\`\`\`tsx
// ✗ Items reorder → indexes stay the same → React thinks each item is unchanged
{todos.map((todo, i) => <TodoItem key={i} todo={todo} />)}
\`\`\`
If \`TodoItem\` has an uncontrolled input, that input keeps its value when the list reorders — because React didn't remount the component, it just updated the \`todo\` prop. The input still shows the *old* item's text.

**Rule:** use a stable, unique ID from the data. Index is fine only for static, never-reordered lists.

\`\`\`tsx
{tickets.map(t => <TicketRow key={t.id} ticket={t} />)}
\`\`\``,
  pros:[
    "Correct keys enable minimal DOM updates on reorder (move the node, don't recreate it)",
    "Forces you to think about data identity up front"
  ],
  cons:[
    "Wrong keys cause subtle bugs with component state that are hard to trace"
  ],
  useCase:
`A drag-and-drop ticket board. Tickets are reordered by the user. Using ticket \`id\` as key means React moves the existing DOM nodes during reorder rather than destroying and recreating them — critical for preserving input state and avoiding animation flickers.`,
  alts:[
    "Why is using array index as key in React bad?",
    "What does the key prop actually do in React?",
    "How does React use the key prop during reconciliation?"
  ]
},

"react-typescript-20": {
  answer:
`**The problem:** Rendering 10,000 DOM nodes is slow even if only 20 are visible. Initial paint is slow; scrolling is jittery.

**Windowing/virtualization** renders only the visible "window" of items — typically 10-30 DOM nodes — and recycles them as you scroll.

\`\`\`tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}       // viewport height
  itemCount={10000}  // total items
  itemSize={60}      // row height in px
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TicketRow ticket={tickets[index]} />
    </div>
  )}
</FixedSizeList>
\`\`\`

**react-window:** lightweight, covers fixed/variable size lists and grids.
**react-virtualized:** more features (table, masonry), heavier.
**@tanstack/virtual:** headless, framework-agnostic, works with any CSS approach.

**When to use:** 100+ items where you see scroll lag or slow initial render. For 20-50 paginated items, virtualization is overkill.`,
  pros:[
    "Constant DOM node count regardless of dataset size — consistent scroll performance",
    "Dramatically reduces initial render time for large lists"
  ],
  cons:[
    "Items must have known (or estimated) heights — variable height is complex",
    "Accessibility for screen readers is harder when items aren't in the DOM",
    "Copy-selecting text across list items doesn't work naturally"
  ],
  useCase:
`A support inbox with 5,000 conversations. Without virtualization, initial render takes 3 seconds and scrolling drops to 20fps. With \`react-window\`, render is instant and scroll is smooth — only the ~12 visible rows exist in the DOM.`,
  alts:[
    "What is list virtualization and why do you need it?",
    "How does react-window work?",
    "When should I virtualize a list in React?"
  ]
},

"react-typescript-21": {
  answer:
`TypeScript with React requires typing props, state, events, and refs correctly.

**Props:**
\`\`\`tsx
interface TicketCardProps {
  ticket: Ticket;
  onResolve: (id: string) => void;
  className?: string;         // optional
  children?: React.ReactNode; // for wrapper components
}
const TicketCard: React.FC<TicketCardProps> = ({ ticket, onResolve }) => { ... };
// Or: function TicketCard({ ticket }: TicketCardProps) { ... }
\`\`\`

**State:** usually inferred from initial value. Explicit when initial is \`null\` or a union:
\`\`\`ts
const [ticket, setTicket] = useState<Ticket | null>(null);
const [status, setStatus] = useState<'open'|'pending'|'resolved'>('open');
\`\`\`

**Events:**
\`\`\`ts
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {};
const onClick  = (e: React.MouseEvent<HTMLButtonElement>) => {};
\`\`\`

**Refs:**
\`\`\`ts
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current is HTMLInputElement | null
\`\`\``,
  pros:[
    "Catch prop type errors and missing required props at compile time",
    "IDE autocomplete for props and event types removes guesswork"
  ],
  cons:[
    "Event types can be verbose — React.ChangeEvent<HTMLInputElement> is a lot to type",
    "React.FC adds an implicit children prop (removed in React 18 types)"
  ],
  useCase:
`A design system \`Button\` component typed with \`interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>\` — it inherits all standard button props (\`onClick\`, \`disabled\`, \`type\`) automatically while adding custom ones like \`variant\`.`,
  alts:[
    "How do you type React component props with TypeScript?",
    "What is the type for a React change event in TypeScript?",
    "How do you type useRef for a DOM element?"
  ]
},

"react-typescript-22": {
  answer:
`Generic components let you build reusable, type-safe UI without casting to \`any\`.

\`\`\`tsx
interface SelectProps<T> {
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
}

function Select<T>({ options, value, onChange, getLabel, getKey }: SelectProps<T>) {
  return (
    <ul>
      {options.map(opt => (
        <li key={getKey(opt)} onClick={() => onChange(opt)}
          style={{ fontWeight: opt === value ? 'bold' : 'normal' }}>
          {getLabel(opt)}
        </li>
      ))}
    </ul>
  );
}

// Usage — TypeScript infers T = User:
<Select<User>
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getLabel={u => u.name}
  getKey={u => u.id}
/>
\`\`\`

In TSX files, the compiler needs a hint to distinguish \`<T>\` from JSX: use \`<T,>\` (trailing comma) or \`<T extends unknown>\`.`,
  pros:[
    "Full type safety without any casting — onChange callback is typed to the exact T",
    "One component serves many data types without duplication"
  ],
  cons:[
    "The trailing comma workaround in TSX is not obvious",
    "Complex generic constraints can make the component hard to read"
  ],
  useCase:
`A \`<DataTable<T>>\` component that accepts columns config with typed accessors. \`columns: Column<T>[]\` where \`Column\` has \`accessor: (row: T) => React.ReactNode\` — the compiler ensures accessor functions match the data type.`,
  alts:[
    "How do you write a generic React component in TypeScript?",
    "Why do you need a trailing comma in generic TSX components?",
    "How do you make a reusable typed list component in React?"
  ]
},

"react-typescript-23": {
  answer:
`Type the return value of a custom hook explicitly when TypeScript would widen it incorrectly.

**Tuple return — must be explicit:**
\`\`\`ts
// Without explicit type, TS infers (boolean | () => void)[] — wrong
function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = useState(initial);
  return [on, () => setOn(v => !v)];
}
// Or use 'as const' on the return:
return [on, () => setOn(v => !v)] as const;
\`\`\`

**Object return — inference works fine (usually):**
\`\`\`ts
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ... fetch logic
  return { data, loading, error }; // TS infers { data: T|null, loading: boolean, error: string|null }
}
\`\`\`

**Explicit return type for documentation and safety:**
\`\`\`ts
function useCounter(initial: number): { count: number; increment: () => void; reset: () => void } {
\`\`\`
Explicit types make the public API visible without reading the implementation.`,
  pros:[
    "Tuple 'as const' is the cleanest way to get narrow tuple types",
    "Explicit return types serve as documentation and catch refactor mistakes"
  ],
  cons:[
    "Explicit types can drift from implementation if not maintained"
  ],
  useCase:
`\`useForm<T>()\` returns \`[T, (field: keyof T, value: T[keyof T]) => void, () => void]\` — the setter is typed to only accept keys of T and values of the matching type. No more typos in field names at the call site.`,
  alts:[
    "Why does TypeScript widen my custom hook's return type?",
    "How do you type a custom hook that returns a tuple?",
    "Should I use an explicit return type on custom hooks?"
  ]
},

"react-typescript-24": {
  answer:
`Both work for React props. The practical differences are small; team convention matters more.

**\`interface\`:**
- Extendable via \`extends\` and declaration merging
- Slightly cleaner error messages for object shapes
- Conventional for React component props that might be extended

**\`type\`:**
- Required for unions: \`type Status = 'open' | 'closed'\`
- Required for mapped types, conditional types, tuples
- Can't be declaration-merged (which is also a safety feature — no accidental augmentation)

\`\`\`ts
// interface — extendable
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

// type — for unions, literals
type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
\`\`\`

**My convention:** \`interface\` for object shapes (component props, API responses), \`type\` for unions and aliases. This matches TypeScript's own docs and most popular style guides.`,
  pros:[
    "Consistent rules reduce the mental overhead of deciding each time",
    "interface extends gives clean inheritance for design system base props"
  ],
  cons:[
    "The difference rarely matters — wrong choice won't break anything",
    "Declaration merging on interfaces can cause unexpected augmentation"
  ],
  useCase:
`A design system: \`ButtonProps\` uses \`interface\` and \`extends React.ButtonHTMLAttributes\`. \`ButtonVariant\` uses \`type\` for the union. Clear, consistent, and follows what TypeScript's own documentation recommends.`,
  alts:[
    "Should I use interface or type for React props?",
    "What is declaration merging and when does it matter?",
    "What can type do that interface cannot?"
  ]
},

"react-typescript-25": {
  answer:
`A HOC is a function that takes a component and returns an enhanced version: \`const AuthButton = withAuth(Button)\`.

**The pattern:**
\`\`\`tsx
function withAuth<P>(WrappedComponent: React.ComponentType<P>) {
  return function AuthGuard(props: P) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Redirect to="/login" />;
    return <WrappedComponent {...props} />;
  };
}
\`\`\`

**Problems with HOCs:**
- **Wrapper hell:** stacking \`withAuth(withData(withTheme(Component)))\` creates deeply nested trees in DevTools
- **Prop collisions:** two HOCs adding a \`data\` prop conflict silently
- **TypeScript complexity:** typing the input/output props is verbose

**Modern alternative: custom hooks.** Instead of \`withAuth(MyPage)\`, the component calls \`useAuth()\` directly.

**When HOCs still make sense:**
- You need to wrap a *class component* with hook-powered logic (HOC can use hooks internally)
- Library-provided HOCs you don't control (\`React.memo\`, old Redux \`connect\`)
- Cross-cutting concerns where you truly want the wrapping (e.g., an error boundary HOC)`,
  pros:[
    "Can add logic to components you don't own or can't modify",
    "React.memo is a HOC and remains the standard memoization tool"
  ],
  cons:[
    "Wrapper nesting is invisible at runtime — hard to debug",
    "Props from HOCs aren't visible to TypeScript without explicit generic handling"
  ],
  useCase:
`A legacy codebase has 50 class components that all need auth checking. A \`withAuth\` HOC wraps all of them — clean, centralized, doesn't require rewriting each class. New components use \`useAuth()\` instead.`,
  alts:[
    "What is a Higher-Order Component and what are its drawbacks?",
    "When would you use a HOC instead of a custom hook?",
    "How do you type a Higher-Order Component in TypeScript?"
  ]
}
