import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ComboOption {
  key: string;
  label: string;
  /** Rendered as a small trailing hint, e.g. a status stamp or item count. */
  hint?: string;
  pinned?: boolean;
}

interface ComboboxProps {
  value: string; // current display text
  options: ComboOption[];
  placeholder?: string;
  allowCreate?: boolean;
  createLabel?: (text: string) => string;
  onSelect: (option: ComboOption) => void;
  onCreate?: (text: string) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * A small hand-rolled combobox: type to filter, Arrow keys to navigate,
 * Enter to select the highlighted option (or create new, if enabled and no
 * exact match exists), Escape to close.
 */
export function Combobox({
  value,
  options,
  placeholder,
  allowCreate,
  createLabel,
  onSelect,
  onCreate,
  disabled,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  function measure() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  useEffect(() => {
    if (!open) return;
    measure();
    const onScrollOrResize = () => measure();
    // capture:true so this also fires for scrolling inside a nested scroll container (e.g. a table or modal body).
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    const pinned = options.filter((o) => o.pinned);
    const rest = options.filter((o) => !o.pinned);
    const match = (o: ComboOption) => !q || o.label.toLowerCase().includes(q);
    return [...pinned.filter(match), ...rest.filter(match)];
  }, [options, text]);

  const exactMatch = options.some((o) => o.label.toLowerCase() === text.trim().toLowerCase());
  const canCreate = allowCreate && text.trim() !== '' && !exactMatch;

  /** An exact (case-insensitive) match against the full option list, if the current text has one. */
  function findExactMatch(): ComboOption | undefined {
    const q = text.trim().toLowerCase();
    if (!q) return undefined;
    return options.find((o) => o.label.toLowerCase() === q);
  }

  function commitHighlighted() {
    // Typing the full name of an existing option should always commit to that
    // option, even if arrow-key navigation left a different row highlighted.
    const exact = findExactMatch();
    if (exact) {
      onSelect(exact);
      setText(exact.label);
      setOpen(false);
      return;
    }
    if (highlight < filtered.length) {
      const opt = filtered[highlight];
      onSelect(opt);
      setText(opt.label);
      setOpen(false);
      return;
    }
    if (canCreate && onCreate) {
      onCreate(text.trim());
      setOpen(false);
    }
  }

  /**
   * Leaving the field (click elsewhere, Tab, etc.) without explicitly clicking
   * an option or pressing Enter used to silently discard whatever was typed -
   * confusing when the typed text exactly matched a real option. Now: an exact
   * match commits on blur too; anything else snaps the text back to the last
   * committed value, so the field never visually shows an uncommitted change.
   */
  function commitOrRevertOnBlur() {
    const exact = findExactMatch();
    if (exact) {
      onSelect(exact);
      setText(exact.label);
    } else {
      setText(value);
    }
    setOpen(false);
  }

  const showList = open && !disabled && (filtered.length > 0 || canCreate);

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        role="combobox"
        onFocus={() => {
          measure();
          setOpen(true);
        }}
        onBlur={commitOrRevertOnBlur}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - (canCreate ? 0 : 1)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            commitHighlighted();
          } else if (e.key === 'Escape') {
            setText(value);
            setOpen(false);
          }
        }}
        className="w-full rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-teal disabled:cursor-not-allowed disabled:opacity-60"
      />
      {showList &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
            className="z-50 max-h-56 overflow-auto rounded-sm border border-line-strong bg-panel-raised shadow-2xl ring-1 ring-ink/10"
          >
            {filtered.map((opt, i) => (
              <li
                key={opt.key}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(opt);
                  setText(opt.label);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-2.5 py-1.5 text-sm ${
                  i === highlight ? 'bg-teal-soft text-teal-dark' : 'text-ink'
                }`}
              >
                <span>{opt.label}</span>
                {opt.hint && <span className="font-data text-xs text-ink-faint">{opt.hint}</span>}
              </li>
            ))}
            {canCreate && (
              <li
                role="option"
                aria-selected={highlight === filtered.length}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onCreate?.(text.trim());
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlight(filtered.length)}
                className={`border-t border-line px-2.5 py-1.5 text-sm italic ${
                  highlight === filtered.length ? 'bg-teal-soft text-teal-dark' : 'text-ink-soft'
                }`}
              >
                {createLabel ? createLabel(text.trim()) : `Create "${text.trim()}"`}
              </li>
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
