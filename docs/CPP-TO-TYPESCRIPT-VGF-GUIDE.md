# C++ Programmer's Guide to TypeScript & VGF

> Quick-reference for C++ engineers reading or writing code in this codebase.
> Covers TypeScript fundamentals in C++ terms, then VGF framework patterns.

---

## Part 1 — TypeScript for C++ Programmers

### 1.1 Type Declarations

| C++ | TypeScript | Notes |
|-----|-----------|-------|
| `int x = 5;` | `let x: number = 5` | TS has one `number` type (f64 under the hood) |
| `const int X = 5;` | `const X = 5` | `const` = immutable binding (not deep-freeze) |
| `std::string s = "hi";` | `const s: string = 'hi'` | All strings are UTF-16, no `char` type |
| `bool b = true;` | `const b: boolean = true` | Same idea |
| `void foo();` | `function foo(): void` | `void` means "returns nothing useful" |
| `auto x = 5;` | `let x = 5` | Type inference — compiler deduces `number` |
| `int* p = nullptr;` | `let p: number \| null = null` | No pointers — `null` is an explicit union member |

**Key difference:** There is no `int` vs `float` vs `double`. Everything is `number`.
There is also `bigint` for arbitrary-precision integers but this codebase doesn't use it.

### 1.2 Interfaces & Structs

C++ structs/classes map to TypeScript **interfaces** (compile-time only, zero runtime cost):

```cpp
// C++
struct Card {
    std::string suit;
    int rank;
};
```

```typescript
// TypeScript
interface Card {
  suit: string
  rank: number
}
```

**Structural typing** — Unlike C++ where `struct A` and `struct B` with identical fields are
different types, TypeScript uses *duck typing*. If the shape matches, it's compatible:

```typescript
interface Card { suit: string; rank: number }
interface Token { suit: string; rank: number }

const c: Card = { suit: 'hearts', rank: 10 }
const t: Token = c  // OK — same shape, no cast needed
```

This is as if C++ had implicit conversion operators for every struct with matching members.

### 1.3 Optional Fields

```cpp
// C++
struct Player {
    std::string name;
    std::optional<int> score;  // might not exist
};
```

```typescript
// TypeScript
interface Player {
  name: string
  score?: number  // the ? means: field might be missing entirely (undefined)
}
```

`?` means the field can be `undefined` (absent). This is different from `null` (explicitly empty):

| Concept | C++ | TypeScript |
|---------|-----|-----------|
| "No value yet" | `std::nullopt` | `undefined` (field absent) |
| "Explicitly empty" | `nullptr` | `null` |
| "Could be either" | `std::optional<T*>` | `T \| null \| undefined` or `T?` with `\| null` |

In this codebase, `null` means "intentionally empty" (e.g. `selectedGame: CasinoGame | null`)
and `?` means "this sub-state doesn't exist yet" (e.g. `roulette?: RouletteGameState`).

### 1.4 Union Types (Tagged / Discriminated)

This is the single most important TypeScript concept with no direct C++ equivalent.

```cpp
// C++ — you'd use std::variant or an enum + union
enum class Action { Fold, Call, Raise };
struct PlayerAction {
    Action type;
    int amount;  // only meaningful for Raise
};
```

```typescript
// TypeScript — union of string literals
type PlayerAction = 'fold' | 'call' | 'raise'

// Or a discriminated union (like std::variant but more ergonomic)
type BetResult =
  | { kind: 'win'; payout: number }
  | { kind: 'loss' }
  | { kind: 'push' }
```

Think of `'fold' | 'call' | 'raise'` as a `constexpr` enum whose values *are* strings.
The compiler tracks which literal you have and narrows accordingly:

```typescript
function handle(action: PlayerAction) {
  if (action === 'raise') {
    // compiler knows action is exactly 'raise' here
  }
}
```

This codebase uses literal unions heavily:

```typescript
type CasinoGame = 'holdem' | 'five_card_draw' | 'blackjack_classic' | ...
type PlayerStatus = 'active' | 'folded' | 'all_in' | 'sitting_out' | 'busted'
type RouletteBetType = 'straight_up' | 'split' | 'street' | 'corner' | ...
```

### 1.5 Generics (Templates)

TypeScript generics work like C++ templates but with *constraints* instead of SFINAE/concepts:

```cpp
// C++
template<typename T>
T identity(T value) { return value; }

// With concepts (C++20)
template<typename T>
requires std::integral<T>
T doubleIt(T x) { return x * 2; }
```

```typescript
// TypeScript
function identity<T>(value: T): T { return value }

// With constraints (like concepts)
function doubleIt<T extends number>(x: T): number { return x * 2 }
```

`extends` in a generic = "must be assignable to". Think of it as a concept/constraint.

### 1.6 `Record<K, V>` — The Hash Map

```cpp
// C++
std::unordered_map<std::string, int> wallet;
wallet["player1"] = 10000;
```

```typescript
// TypeScript
type Wallet = Record<string, number>
const wallet: Wallet = { player1: 10000 }

// Access
wallet['player1']   // 10000
wallet.player1      // also 10000 (dot syntax for string keys)
```

`Record<string, number>` = "an object where every key is a string and every value is a number".
Same as `std::unordered_map<std::string, int>` semantically.

You'll see this everywhere in the game state:

```typescript
wallet: Record<string, number>                 // playerId -> chip balance
holeCards: Record<string, [Card, Card]>        // playerId -> two cards
gameChangeVotes: Record<string, CasinoGame>    // playerId -> voted game
```

### 1.7 Arrays & Tuples

```cpp
// C++
std::vector<int> nums = {1, 2, 3};
std::tuple<int, std::string> pair = {42, "hello"};
std::array<int, 2> fixed = {1, 2};
```

```typescript
// TypeScript
const nums: number[] = [1, 2, 3]            // like vector<int>
const pair: [number, string] = [42, 'hello'] // like tuple<int, string>
// No fixed-size array type — [Card, Card] is a tuple of exactly 2
```

The `[Card, Card]` tuple for hole cards = `std::tuple<Card, Card>` or `std::array<Card, 2>`.

### 1.8 `type` vs `interface`

Both define shapes. Quick rule:

| Use `interface` for | Use `type` for |
|-------------------|---------------|
| Object shapes (structs) | Unions, intersections, aliases |
| Can be `extends`'d (inheritance) | Can't be `extends`'d but can be `&`'d |

```typescript
interface Animal { name: string }
interface Dog extends Animal { breed: string }  // like C++ : public Animal

type StringOrNumber = string | number            // can't do this with interface
type DogAlias = Animal & { breed: string }       // intersection = multiple inheritance
```

In this codebase: interfaces for game state structures, types for unions and aliases.

### 1.9 Immutable Update Pattern (Spread Syntax)

C++ developers: **this is critical**. All state updates in this project are immutable.
Instead of mutating, you create a new object with changes:

```cpp
// C++ (mutable style — what you're used to)
state.pot += betAmount;
state.players.push_back(newPlayer);
```

```typescript
// TypeScript (immutable style — what this codebase requires)
const newState = {
  ...state,                                    // spread: copy all fields
  pot: state.pot + betAmount,                  // override pot with new value
  players: [...state.players, newPlayer],      // new array with appended player
}
```

`...obj` (spread) is like `memcpy` of all fields into a new object. Any fields you list
after the spread override the copied values. The original object is untouched.

**Why?** VGF calls `Object.freeze()` on game state. If you try `state.pot = 100`,
it throws a `TypeError` at runtime. You *must* return a new object.

### 1.10 `as const` and Readonly

```cpp
// C++
constexpr std::array<const char*, 3> SUITS = {"hearts", "diamonds", "clubs"};
```

```typescript
// TypeScript
const SUITS = ['hearts', 'diamonds', 'clubs'] as const
// Type is: readonly ['hearts', 'diamonds', 'clubs']
// Each element is a string literal type, not just string
```

`as const` makes the value deeply readonly and narrows literal types. Like `constexpr` for data.

### 1.11 Type Guards (Runtime Type Checking)

C++ has `dynamic_cast` and `typeid`. TypeScript has **type guards**:

```typescript
function isCasinoPlayer(value: unknown): value is CasinoPlayer {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj.id === 'string' && typeof obj.name === 'string'
}

// Usage — compiler narrows the type after the check
if (isCasinoPlayer(data)) {
  console.log(data.name)  // safe — compiler knows it's CasinoPlayer
}
```

The `value is CasinoPlayer` return type annotation tells the compiler: "if this returns true,
treat the argument as `CasinoPlayer` from here on." Like a `dynamic_cast` that returns a bool.

### 1.12 `unknown` vs `any`

| Type | C++ Equivalent | Safe? |
|------|---------------|-------|
| `unknown` | `void*` that requires a cast before use | Yes |
| `any` | Disables type checking entirely | No — avoid |

`unknown` = "I don't know the type yet, force me to check before using it."
`any` = "Turn off the type system." This codebase avoids `any` except at VGF boundaries.

### 1.13 Import / Export (Header Files)

TypeScript has no header files. Instead:

```typescript
// card.ts — "the .h and .cpp combined"
export interface Card { suit: string; rank: number }
export function createDeck(): Card[] { /* ... */ }

// game.ts — "the #include"
import { Card, createDeck } from './card.js'
// NOTE: the .js extension is required in this project (ESM modules)
```

`import type { Card }` = import only for type checking, erased at runtime. Like a
forward declaration that the linker never resolves.

### 1.14 Async / Await

```cpp
// C++ — std::future / coroutines (C++20)
std::future<int> fetchData() {
    co_return 42;
}
auto result = co_await fetchData();
```

```typescript
// TypeScript — built-in async/await
async function fetchData(): Promise<number> {
  return 42
}
const result = await fetchData()
```

`Promise<T>` = `std::future<T>`. `async` functions always return a `Promise`.
`await` suspends until the promise resolves — like `co_await`.

### 1.15 Quick Syntax Reference

| C++ | TypeScript | What it does |
|-----|-----------|-------------|
| `std::vector<T>` | `T[]` | Dynamic array |
| `std::unordered_map<K,V>` | `Record<K,V>` | Hash map |
| `std::optional<T>` | `T \| undefined` or `T?` field | Maybe-value |
| `std::variant<A,B,C>` | `A \| B \| C` | Tagged union |
| `enum class E { A, B }` | `type E = 'A' \| 'B'` | Enumeration |
| `static_cast<T>(x)` | `x as T` | Type assertion (unchecked) |
| `dynamic_cast<T>(x)` | Type guard function | Runtime check + narrow |
| `template<T>` | `<T>` | Generic / template parameter |
| `T::value_type` | `T[number]` (array element) | Associated type access |
| `#include "x.h"` | `import { X } from './x.js'` | Module import |
| `namespace ns { }` | Files are modules (implicit) | Namespacing |
| `const T&` | `Readonly<T>` | Immutable reference |
| `nullptr` | `null` | Null pointer / empty |
| `throw std::runtime_error()` | `throw new Error()` | Exception |
| `try { } catch (...) { }` | `try { } catch (e) { }` | Exception handling |
| Lambda `[&](auto x){ }` | `(x) => { }` or `(x: T) => { }` | Closures / lambdas |

---

## Part 2 — VGF Framework in C++ Terms

VGF (Volley Games Framework) is a **server-authoritative, Redux-like, phase-based state machine**
for multiplayer games. Here's how to think about it as a C++ developer.

### 2.1 The Mental Model

Think of VGF as:

```
Finite State Machine (phases)
  + Immutable State Store (like a const struct that gets replaced each tick)
  + Pure Reducer Functions (state transitions)
  + Async Thunks (side-effectful commands)
  + Network Sync (state broadcast to clients)
```

The closest C++ analogy: imagine a game server where the entire game state is a single
`const` struct. To change anything, you call a pure function that takes the old state
and returns a new one. The framework diffs and broadcasts changes to clients.

### 2.2 GameRuleset — The Top-Level Definition

```cpp
// C++ mental model of what VGF's GameRuleset looks like
struct GameRuleset {
    // Factory: creates initial state
    GameState (*setup)(std::optional<GameState> partial);

    // Global reducers: pure functions available in ALL phases
    std::unordered_map<std::string, ReducerFn> reducers;

    // Global thunks: async operations available in ALL phases
    std::unordered_map<std::string, ThunkFn> thunks;

    // Phase definitions: the state machine
    std::unordered_map<std::string, Phase> phases;

    // Connection callbacks
    void (*onConnect)(Context, ClientId);
    void (*onDisconnect)(Context, ClientId);
};
```

Actual TypeScript (simplified from our codebase):

```typescript
const casinoRuleset: GameRuleset<CasinoGameState> = {
  setup: (partial?) => createInitialCasinoState(partial),
  reducers: {
    casinoAddPlayer,       // available in every phase
    casinoRemovePlayer,
    casinoSetSelectedGame,
    // ...
  },
  thunks: {
    handleConnect,         // available in every phase
    handleDisconnect,
  },
  phases: {
    LOBBY:              lobbyPhase,
    GAME_SELECT:        gameSelectPhase,
    POSTING_BLINDS:     postingBlindsPhase,
    DEALING_HOLE_CARDS: dealingHoleCardsPhase,
    PRE_FLOP_BETTING:   preFlopBettingPhase,
    // ... 30+ phases across all games
  },
}
```

### 2.3 Reducers — Pure State Transitions

**C++ analogy:** A pure function. No I/O, no globals, deterministic.

```cpp
// C++ equivalent concept
GameState casinoAddPlayer(const GameState& state, const Player& player) {
    GameState newState = state;  // copy (immutable original)
    newState.players.push_back(player);
    newState.wallet[player.id] = 10000;
    return newState;             // return new state
}
```

Actual TypeScript:

```typescript
// Type alias: Reducer that takes a CasinoPlayer argument
type Reducer<TArgs extends unknown[] = never[]> = GameReducer<CasinoGameState, TArgs>
//    ^^^^^^ like a C++ template alias:
//    template<typename... Args>
//    using Reducer = std::function<GameState(const GameState&, Args...)>;

const casinoAddPlayer: Reducer<[CasinoPlayer]> = (state, player) => ({
  ...state,
  players: [...state.players, player],
  wallet: { ...state.wallet, [player.id]: state.wallet[player.id] ?? 10000 },
})
```

**Rules (enforced by VGF at runtime):**
- `state` is `Object.freeze()`'d — mutation throws `TypeError`
- No `Date.now()`, `Math.random()` — pass timestamps/randoms as arguments
- Cannot modify `state.phase` — throws `PhaseModificationError`
- Same inputs must always produce same output

### 2.4 Thunks — Async Commands with Side Effects

**C++ analogy:** A command handler / controller method. Has access to the world.

```cpp
// C++ equivalent concept
class ThunkContext {
public:
    const GameState& getState();             // snapshot (frozen)
    void dispatch(string reducer, Args...);  // SYNCHRONOUS state update
    Future<void> dispatchThunk(string, Args...);
    Scheduler& scheduler;                    // persistent timers
    Logger& logger;
};

// Usage
Future<void> processPlayerAction(ThunkContext& ctx, string playerId, Action action, int amount) {
    auto state = ctx.getState();

    if (!isValidAction(state, playerId, action)) return;  // validate

    ctx.dispatch("updateBet", playerId, amount);  // fires reducer immediately
    // getState() now returns the updated state

    ctx.scheduler.upsertTimeout({
        .name = "action-timeout",
        .delayMs = 30000,
        .dispatch = {.kind = "thunk", .name = "autoFold"},
    });
}
```

Actual TypeScript:

```typescript
const processPlayerAction: Thunk<[string, PlayerAction, number]> =
  async (ctx, playerId, action, amount) => {
    const state = ctx.getState()  // frozen snapshot

    if (!isValidAction(state, playerId, action)) return

    ctx.dispatch('updateBet', playerId, amount)  // SYNCHRONOUS — state updated NOW
    // ctx.getState() already reflects the change

    await ctx.scheduler.upsertTimeout({
      name: 'action-timeout',
      delayMs: 30_000,
      mode: 'hold',
      dispatch: { kind: 'thunk', name: 'autoFold' },
    })
  }
```

**Key insight:** `ctx.dispatch()` is **synchronous**. After calling it, `ctx.getState()`
returns the updated state. This is unlike typical async message passing — it's an
immediate function call under the hood.

### 2.5 Phases — The State Machine

**C++ analogy:** States in a finite state machine, each with their own set of allowed operations.

```cpp
// C++ mental model
struct Phase {
    // Reducers only available in this phase
    std::unordered_map<std::string, ReducerFn> reducers;

    // Thunks only available in this phase
    std::unordered_map<std::string, ThunkFn> thunks;

    // Called when entering this phase (async init)
    // RETURNS GameState — NOT void
    Future<GameState> (*onBegin)(OnBeginContext&);

    // Called when leaving this phase (cleanup)
    // RETURNS GameState — NOT void
    Future<GameState> (*onEnd)(OnEndContext&);

    // Checked after every reducer dispatch — if true, phase ends
    bool (*endIf)(ReadonlyContext&);

    // Determines next phase (can be static string or dynamic function)
    std::string (*next)(ReadonlyContext&);
};
```

**Phase lifecycle:**
```
ENTER ──► onBegin() ──► [phase is ACTIVE] ──► endIf()? ──► onEnd() ──► next() ──► EXIT
                              │                    │
                         reducers/thunks      checked after
                         are available        every dispatch
```

### 2.6 Phase Callback Contexts — THE Critical Gotcha

This is where C++ intuition will mislead you. **Different callbacks get different context objects.**
It's as if each callback receives a different interface pointer:

```cpp
// C++ analogy — different interfaces for different callbacks
struct IThunkContext {          // Thunks get the full interface
    GameState getState();
    void dispatch(string, ...);          // YES
    Future<void> dispatchThunk(string, ...);  // YES
    Scheduler& scheduler;                // YES
};

struct IOnBeginContext {        // onBegin gets a DIFFERENT interface
    GameState getState();
    void reducerDispatcher(string, ...); // YES — different name!
    Future<void> thunkDispatcher(string, ...);  // YES — different name!
    // NO dispatch()
    // NO scheduler
};

struct IGameActionContext {     // endIf/next get read-only access
    Session& session;          // use session.state, NOT getState()
    // NOTHING else
};
```

**Summary table:**

| Callback | How to dispatch | How to read state | Must return state? |
|----------|----------------|-------------------|--------------------|
| **Thunk** | `ctx.dispatch('name', args)` | `ctx.getState()` | No (returns `void`) |
| **onBegin** | `ctx.reducerDispatcher('name', args)` | `ctx.getState()` | **YES** |
| **onEnd** | `ctx.reducerDispatcher('name', args)` | `ctx.getState()` | **YES** |
| **endIf** | Cannot dispatch (read-only) | `ctx.session.state` | No (returns `bool`) |
| **next** | Cannot dispatch (read-only) | `ctx.session.state` | No (returns `string`) |

**Common mistake:** Calling `ctx.dispatch()` in `onBegin` — it doesn't exist there.
Use `ctx.reducerDispatcher()` instead. This has crashed every game in the project at some point.

### 2.7 Root vs Phase-Scoped Reducers

```cpp
// C++ analogy: think of it like method resolution
// Root reducers = base class virtual methods (available everywhere)
// Phase reducers = derived class methods (only available in that phase)

// VGF resolution order:
// 1. Check current phase's reducers
// 2. Check root (ruleset.reducers)
// 3. Throw InvalidActionError
```

Root reducers (defined in `casinoRuleset.reducers`) are available in **every** phase.
You do NOT need to re-register them in each phase's `reducers` map.

### 2.8 State Immutability — Object.freeze()

```cpp
// C++ analogy: VGF basically does this before every reducer call
const GameState& frozenState = state;  // const reference — can't modify

// This would be a compile error in C++:
frozenState.pot = 100;  // ERROR: assignment to const

// In TypeScript, Object.freeze() makes it a RUNTIME error:
state.pot = 100  // TypeError: Cannot assign to read only property 'pot'
```

**Always use spread syntax** to create new state:

```typescript
// WRONG — runtime crash
state.pot = 100

// RIGHT — new object
return { ...state, pot: 100 }
```

### 2.9 The Scheduler — Persistent Timers

Don't use `setTimeout`. VGF's scheduler survives server restarts:

```cpp
// C++ analogy: a persistent timer backed by Redis
// If the server crashes and restarts, the timer still fires

// setTimeout equivalent — but persistent
ctx.scheduler.upsertTimeout({
    .name = "action-timer",     // unique ID — upsert replaces existing
    .delayMs = 30000,           // 30 seconds
    .mode = "hold",             // "hold" = pause on disconnect
    .dispatch = {
        .kind = "thunk",
        .name = "handleTimeout",
    },
});

// Cancel
ctx.scheduler.clearTimeout("action-timer");
```

### 2.10 Client-Side Hooks (React / Display)

On the client, VGF provides React hooks that subscribe to server state:

```typescript
// These are like Observer pattern subscriptions that re-render on change
const state = useStateSync()                          // full state (re-renders on ANY change)
const pot = useStateSyncSelector(s => s.pot)          // derived value (re-renders only when pot changes)
const phase = usePhase()                              // current phase name
const dispatch = useDispatch()                        // sends action to server
const dispatchThunk = useDispatchThunk()              // sends thunk to server
```

**C++ analogy:** Think of `useStateSyncSelector` as registering a callback that fires
whenever a specific field in a shared memory struct changes. The "selector" function
`s => s.pot` extracts the value to watch — only re-renders if `pot` actually changes.

### 2.11 CasinoGameState Design Pattern

The game state is a **flat struct with optional sub-objects** — not an inheritance hierarchy:

```cpp
// C++ analogy — NOT how we do it
class HoldemState : public GameState { ... };
class RouletteState : public GameState { ... };

// C++ analogy — HOW we actually do it (composition, not inheritance)
struct CasinoGameState {
    // Always present
    std::string phase;
    CasinoGame selectedGame;              // which game is active
    std::unordered_map<std::string, int> wallet;
    std::vector<CasinoPlayer> players;
    int pot;
    // ...

    // Only populated when that game is active (like std::optional)
    std::optional<HoldemSubState>    holdem;
    std::optional<RouletteSubState>  roulette;
    std::optional<BlackjackSubState> blackjack;
    std::optional<CrapsSubState>     craps;
    // ...
};
```

**Why flat?** VGF serialises and broadcasts the entire state. A single flat struct is
simpler to freeze, diff, and sync than a polymorphic class hierarchy. The `selectedGame`
field tells you which optional sub-state is populated.

### 2.12 Index Signature — The `[key: string]: unknown`

You'll see this on every game state interface:

```typescript
interface CasinoGameState {
  [key: string]: unknown    // <-- this line
  phase: CasinoPhase
  pot: number
  // ...
}
```

**C++ analogy:** It's like inheriting from `std::unordered_map<std::string, std::any>`.
It means the object can have *any* string key with *any* value, in addition to the
declared fields. VGF requires this because `BaseGameState extends Record<string, unknown>`.

The declared fields (`phase`, `pot`, etc.) give you type safety for known keys.
The index signature satisfies VGF's requirement that state can hold arbitrary data.

---

## Part 3 — Common Patterns Quick Reference

### Reading state in a reducer

```typescript
const myReducer: Reducer<[string, number]> = (state, playerId, amount) => ({
  ...state,
  wallet: { ...state.wallet, [playerId]: (state.wallet[playerId] ?? 0) + amount },
})
```

`??` is the **nullish coalescing operator** — like `value.value_or(0)` on `std::optional`.
`[playerId]` as a key is a **computed property name** — the variable's value becomes the key.

### Checking phase in endIf

```typescript
endIf: (ctx) => ctx.session.state.allBetsPlaced === true,
```

`===` is **strict equality** (no type coercion). Always use `===`, never `==`.
`==` in TypeScript is like C's implicit conversions — `0 == ""` is `true`. Don't.

### Transitioning to the next phase

```typescript
next: (ctx) => {
  const state = ctx.session.state
  switch (state.selectedGame) {
    case 'holdem': return 'DEALING_HOLE_CARDS'
    case 'blackjack_classic': return 'BJ_PLACE_BETS'
    default: return 'GAME_SELECT'
  }
}
```

`switch` on a union type — the compiler checks exhaustiveness if you add
`default: return assertNever(state.selectedGame)`.

### Filtering and mapping arrays

```typescript
// C++ equivalent: filter + transform in ranges
const activePlayers = state.players
  .filter(p => p.status === 'active')          // like std::views::filter
  .map(p => p.id)                              // like std::views::transform

// C++ ranges equivalent:
// auto activePlayers = state.players
//   | std::views::filter([](auto& p){ return p.status == "active"; })
//   | std::views::transform([](auto& p){ return p.id; });
```

### Destructuring (structured bindings)

```typescript
// TypeScript
const { pot, players, wallet } = state
const [first, ...rest] = players

// C++ equivalent (C++17 structured bindings)
auto& [pot, players, wallet] = state;  // approximately
auto& [first, rest...] = players;      // no direct equivalent for rest
```

---

## Part 4 — TypeScript Tooling Cheat Sheet

| Task | Command | C++ Equivalent |
|------|---------|---------------|
| Type check | `pnpm typecheck` | Compile without linking |
| Build | `pnpm build` | Full compile + link |
| Run tests | `pnpm test -- --run` | `ctest` / `make test` |
| Run single test | `pnpm test -- --run path/to/test` | `ctest -R testname` |
| E2E tests | `pnpm test:e2e` | Integration test suite |

**Important:** `vitest` (the test runner) does NOT check types. A test can pass
even if there are type errors. Always run `pnpm typecheck` separately — it's
like running the compiler even though your test binary linked fine.
