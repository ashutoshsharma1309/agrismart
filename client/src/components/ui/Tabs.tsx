import {
  createContext,
  useContext,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/utils';

type TabsContextShape = { value: string; setValue: (v: string) => void; baseId: string };
const TabsContext = createContext<TabsContextShape | null>(null);

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  children,
  className,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Roving-focus keyboard handling per the WAI-ARIA tabs pattern: Left/Right wrap
// through the tabs (Home/End jump to the ends), and moving focus activates the
// tab (automatic activation). Delegating to `.click()` reuses each trigger's
// existing selection logic.
function handleTabsKeydown(e: KeyboardEvent<HTMLDivElement>) {
  const navKeys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
  if (!navKeys.includes(e.key)) return;
  const tabs = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([aria-disabled="true"])'),
  );
  if (tabs.length === 0) return;
  const current = tabs.findIndex((t) => t === document.activeElement);
  let next = current;
  if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
  else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  if (tabs[next] && next !== current) {
    e.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  }
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      onKeyDown={handleTabsKeydown}
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 shadow-inner',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      // Roving tabindex: only the active tab is in the tab order; arrow keys move
      // focus between the rest.
      tabIndex={active ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'rounded-lg px-4 py-1.5 text-sm font-semibold tracking-tight transition duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        active
          ? 'bg-white text-ink shadow-sm ring-1 ring-black/[0.04]'
          : 'text-ink-muted hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('mt-4 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
