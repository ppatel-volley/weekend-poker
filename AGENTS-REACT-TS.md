# React/TypeScript Agent Guidelines

> This file supplements the main `AGENTS.md` with React, TypeScript, and JavaScript-specific patterns.
>
> **Template**: Customize or replace sections below to match your project's tech stack.
> For non-React projects, create an equivalent file (e.g., `AGENTS-PYTHON.md`, `AGENTS-CSHARP.md`).

---

## Project Configuration

### Test Commands

```bash
# Run all tests once
pnpm test -- --run

# Run specific package tests (monorepo)
pnpm --filter @yourproject/shared test
pnpm --filter @yourproject/server test

# Alternative commands
npm test
yarn test
```

### Build Commands

```bash
# Type checking
pnpm typecheck
# or
npx tsc --noEmit

# Production build
pnpm build
# or
npm run build

# Development mode
pnpm dev
```

---

## TypeScript Testing (Vitest)

### Basic Test Syntax

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('MyModule', () => {
    beforeEach(() => {
        // Setup before each test
    })

    afterEach(() => {
        // Cleanup after each test
    })

    it('should handle the expected case', () => {
        const result = myFunction(input)
        expect(result).toBe(expectedValue)
    })

    it('should handle edge cases', () => {
        expect(() => myFunction(null)).toThrow()
    })
})
```

### Common Assertions

```typescript
// Equality
expect(value).toBe(exact)           // Strict equality (===)
expect(value).toEqual(deep)         // Deep equality
expect(value).toBeCloseTo(num, 5)   // Float comparison with precision

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

// Numbers
expect(num).toBeGreaterThan(3)
expect(num).toBeGreaterThanOrEqual(3)
expect(num).toBeLessThan(5)
expect(num).toBeLessThanOrEqual(5)

// Strings
expect(str).toMatch(/regex/)
expect(str).toContain('substring')

// Arrays/Objects
expect(arr).toContain(item)
expect(arr).toHaveLength(3)
expect(obj).toHaveProperty('key')
expect(obj).toHaveProperty('key', 'value')

// Functions/Errors
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('error message')
expect(() => fn()).toThrow(ErrorType)
```

### Mocking with vi

```typescript
// Mock functions
const mockFn = vi.fn()
const mockFnWithReturn = vi.fn(() => 'return value')
const mockFnWithImpl = vi.fn().mockImplementation((x) => x * 2)

// Mock assertions
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenLastCalledWith('lastArg')

// Mock modules
vi.mock('./myModule', () => ({
    myFunction: vi.fn(() => 'mocked'),
}))

// Spy on methods
const spy = vi.spyOn(object, 'method')
spy.mockReturnValue('mocked')

// Timers
vi.useFakeTimers()
vi.advanceTimersByTime(1000)
vi.runAllTimers()
vi.useRealTimers()
```

### Mock Context Pattern (for State Machines/Reducers)

```typescript
const createMockContext = <TState>(initialState: TState) => {
    let state = initialState
    return {
        getState: () => state,
        setState: (newState: TState) => { state = newState },
        dispatch: (action: Action) => {
            state = reducer(state, action)
        },
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        },
    }
}
```

### Async Testing

```typescript
it('should handle async operations', async () => {
    const result = await asyncFunction()
    expect(result).toBe(expected)
})

it('should handle promises', () => {
    return expect(asyncFunction()).resolves.toBe(expected)
})

it('should handle rejections', () => {
    return expect(failingFunction()).rejects.toThrow('error')
})
```

---

## React Testing

### Component Testing with React Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
    it('should render correctly', () => {
        render(<MyComponent title="Hello" />)
        expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('should handle user interaction', async () => {
        const user = userEvent.setup()
        const handleClick = vi.fn()

        render(<MyComponent onClick={handleClick} />)

        await user.click(screen.getByRole('button'))
        expect(handleClick).toHaveBeenCalled()
    })

    it('should update on input', async () => {
        const user = userEvent.setup()
        render(<MyComponent />)

        const input = screen.getByRole('textbox')
        await user.type(input, 'test value')

        expect(input).toHaveValue('test value')
    })
})
```

### Query Priority (Best to Worst)

```typescript
// 1. Accessible queries (preferred)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email')
screen.getByPlaceholderText('Search...')
screen.getByText('Welcome')
screen.getByDisplayValue('current value')

// 2. Semantic queries
screen.getByAltText('Profile picture')
screen.getByTitle('Close')

// 3. Test IDs (last resort)
screen.getByTestId('custom-element')
```

### Async Patterns

```typescript
// Wait for element to appear
await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
})

// Find (built-in waiting)
const element = await screen.findByText('Loaded')

// Wait for element to disappear
await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
})
```

---

## React Patterns

### Component Structure

```typescript
// Prefer function components with TypeScript
interface MyComponentProps {
    title: string
    onAction?: () => void
    children?: React.ReactNode
}

export function MyComponent({ title, onAction, children }: MyComponentProps) {
    return (
        <div>
            <h1>{title}</h1>
            {children}
            {onAction && <button onClick={onAction}>Action</button>}
        </div>
    )
}
```

### Hooks Patterns

```typescript
// Custom hook pattern
function useMyHook(initialValue: string) {
    const [value, setValue] = useState(initialValue)

    const updateValue = useCallback((newValue: string) => {
        setValue(newValue)
    }, [])

    return { value, updateValue }
}

// Effect cleanup
useEffect(() => {
    const subscription = subscribe()
    return () => {
        subscription.unsubscribe()
    }
}, [dependency])

// Memoization
const expensiveValue = useMemo(() => computeExpensive(data), [data])
const stableCallback = useCallback(() => handleAction(id), [id])
```

### State Management Patterns

```typescript
// Reducer pattern
type Action =
    | { type: 'INCREMENT' }
    | { type: 'DECREMENT' }
    | { type: 'SET'; payload: number }

function reducer(state: number, action: Action): number {
    switch (action.type) {
        case 'INCREMENT': return state + 1
        case 'DECREMENT': return state - 1
        case 'SET': return action.payload
        default: return state
    }
}

// Context pattern
const MyContext = createContext<MyContextType | null>(null)

function useMyContext() {
    const context = useContext(MyContext)
    if (!context) {
        throw new Error('useMyContext must be used within MyProvider')
    }
    return context
}
```

---

## Three.js Development

> For detailed Three.js patterns, reference the skill files in `.claude/skills/threejs-*/`

### Shader Development

When writing or modifying shader code (`.glsl` files or shader strings in `.ts`/`.tsx`):

#### Required Practices

<shader-rules>
  <rule id="reference" severity="required">
    Follow your project's shader documentation or established patterns
  </rule>
  <rule id="precision" severity="required">
    All fragment shaders must declare `precision highp float;`
  </rule>
  <rule id="no-conditionals" severity="preferred">
    Use mix(), step(), smoothstep() instead of if/else where possible
  </rule>
  <rule id="varyings" severity="required">
    Varyings must be declared identically in vertex and fragment shaders
  </rule>
  <rule id="texture-functions" severity="required">
    Use texture2D() for GLSL 1.0 (default), texture() for GLSL 3.0
  </rule>
  <rule id="uniforms" severity="required">
    Use float instead of int for all uniforms (WebGL ES compatibility)
  </rule>
</shader-rules>

#### Performance Guidelines

<shader-performance>
  <pattern name="branching" preferred="mix(a, b, step(0.5, x))" avoid="if (x > 0.5) { ... }" />
  <pattern name="clamping" preferred="clamp(x, 0.0, 1.0)" avoid="max(0.0, min(1.0, x))" />
  <pattern name="conditionals" preferred="max(x - threshold, 0.0)" avoid="if (x > threshold) { x - threshold }" />
  <pattern name="noise-octaves" preferred="LOD-based count" avoid="Fixed high count (7+)" />
</shader-performance>

#### Common Mistakes to Avoid

<shader-mistakes>
  <mistake id="unused-calculations">Don't compute values you never use (e.g., luminance for tone mapping)</mistake>
  <mistake id="duplicate-code">Extract shared functions (noise, hash) to reusable strings</mistake>
  <mistake id="magic-numbers">Consider exposing tuning values as uniforms</mistake>
  <mistake id="integer-uniforms">Use float instead of int for WebGL ES compatibility</mistake>
</shader-mistakes>

#### Shader Checklist

<shader-checklist>
  <item>Precision declared in fragment shaders</item>
  <item>No unused variables or calculations</item>
  <item>Varyings match between vertex/fragment</item>
  <item>Conditionals minimized or justified</item>
  <item>Tested visually in browser</item>
</shader-checklist>

### React Three Fiber Patterns

```typescript
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

function MyMesh() {
    const meshRef = useRef<THREE.Mesh>(null)

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta
        }
    })

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
        </mesh>
    )
}

function Scene() {
    return (
        <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <MyMesh />
        </Canvas>
    )
}
```

---

## TypeScript Best Practices

### Type Definitions

```typescript
// Prefer interfaces for objects
interface User {
    id: string
    name: string
    email: string
}

// Use type for unions, intersections, mapped types
type Status = 'pending' | 'active' | 'completed'
type UserWithStatus = User & { status: Status }

// Generic constraints
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
}

// Utility types
type PartialUser = Partial<User>
type ReadonlyUser = Readonly<User>
type UserKeys = keyof User
type NameOnly = Pick<User, 'name'>
type WithoutEmail = Omit<User, 'email'>
```

### Strict Null Handling

```typescript
// Non-null assertion (use sparingly)
const element = document.getElementById('app')!

// Preferred: proper null checks
const element = document.getElementById('app')
if (!element) {
    throw new Error('App element not found')
}

// Optional chaining
const name = user?.profile?.name

// Nullish coalescing
const displayName = user.name ?? 'Anonymous'
```

### Type Guards

```typescript
// Custom type guard
function isUser(obj: unknown): obj is User {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj
    )
}

// Usage
if (isUser(data)) {
    console.log(data.name) // TypeScript knows data is User
}

// Discriminated unions
type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string }

function handleResult<T>(result: Result<T>) {
    if (result.success) {
        return result.data // TypeScript knows this is T
    } else {
        throw new Error(result.error)
    }
}
```

---

## ESLint/Prettier

### Common Fixes

```typescript
// Unused variables - prefix with underscore
function handler(_event: Event) { }

// Explicit return types for exported functions
export function calculate(x: number): number {
    return x * 2
}

// Prefer const
const value = 'immutable'

// Avoid any - use unknown
function parse(input: unknown): Data {
    // validate and narrow type
}
```

---

## Package Manager Commands (pnpm/npm/yarn)

```bash
# Install dependencies
pnpm install
npm install
yarn

# Add dependency
pnpm add package-name
npm install package-name
yarn add package-name

# Add dev dependency
pnpm add -D package-name
npm install --save-dev package-name
yarn add -D package-name

# Run script
pnpm run script-name
npm run script-name
yarn script-name

# Monorepo filter (pnpm)
pnpm --filter @scope/package-name command
```
