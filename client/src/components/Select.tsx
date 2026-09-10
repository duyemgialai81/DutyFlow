import React, {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cx } from "../lib/utils";

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "defaultValue" | "onChange"> {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: any) => void;
  options?: SelectOption[];
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  searchable?: boolean;
  autoFocus?: boolean;
}

interface ParsedOption {
  value: string;
  label: ReactNode;
  textSearch: string;
  disabled?: boolean;
}

function extractOptions(children: ReactNode): ParsedOption[] {
  const items: ParsedOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === React.Fragment) {
      items.push(...extractOptions((child.props as any).children));
    } else {
      const props = child.props as any;
      const val = props.value !== undefined ? String(props.value) : "";
      const label = props.children ?? props.label ?? val;
      const textSearch =
        typeof label === "string"
          ? label.toLowerCase()
          : typeof props.label === "string"
          ? props.label.toLowerCase()
          : String(val).toLowerCase();
      items.push({
        value: val,
        label,
        textSearch,
        disabled: props.disabled,
      });
    }
  });
  return items;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    value,
    defaultValue,
    onChange,
    options: optionsProp,
    children,
    placeholder,
    disabled = false,
    className,
    id,
    name,
    searchable,
    autoFocus,
    ...rest
  },
  forwardedRef,
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const [open, setOpen] = useState(false);
  const [internalVal, setInternalVal] = useState<string>(
    value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : "",
  );
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
    isFlipped: boolean;
  }>({
    top: 0,
    left: 0,
    width: 0,
    isFlipped: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
  const optionListRef = useRef<HTMLDivElement>(null);

  // Sync controlled value prop
  useEffect(() => {
    if (value !== undefined) {
      setInternalVal(String(value));
    }
  }, [value]);

  // Support autoFocus
  useEffect(() => {
    if (autoFocus && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [autoFocus]);

  // Extract options from either props.options or children
  const parsedOptions = useMemo<ParsedOption[]>(() => {
    if (optionsProp) {
      return optionsProp.map((o) => ({
        value: String(o.value),
        label: o.label,
        textSearch:
          typeof o.label === "string" ? o.label.toLowerCase() : String(o.value).toLowerCase(),
        disabled: o.disabled,
      }));
    }
    return extractOptions(children);
  }, [optionsProp, children]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return parsedOptions;
    const q = search.trim().toLowerCase();
    return parsedOptions.filter((o) => o.textSearch.includes(q));
  }, [parsedOptions, search]);

  const isSearchable = searchable ?? parsedOptions.length > 7;

  // Selected option display
  const selectedOption = useMemo(
    () => parsedOptions.find((o) => o.value === internalVal),
    [parsedOptions, internalVal],
  );

  const displayLabel = selectedOption
    ? selectedOption.label
    : placeholder || (parsedOptions[0]?.label ?? "");

  // Update floating popover position via Portal
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = Math.min(320, Math.max(100, (filteredOptions.length || 1) * 40 + 60));

    let isFlipped = false;
    let top = rect.bottom + 4;

    // Flip up if bottom overflows viewport and there's enough space above
    if (top + popoverHeight > window.innerHeight && rect.top - popoverHeight > 10) {
      top = Math.max(10, rect.top - popoverHeight - 4);
      isFlipped = true;
    }

    let left = rect.left;
    const width = Math.max(rect.width, 180);
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, rect.right - width);
    }

    setPopoverPos({ top, left, width, isFlipped });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, filteredOptions.length]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Focus & highlight management when opening
  useEffect(() => {
    if (open) {
      const activeIdx = filteredOptions.findIndex((o) => o.value === internalVal);
      setHighlightedIndex(activeIdx >= 0 ? activeIdx : 0);

      if (isSearchable) {
        setTimeout(() => searchInputRef.current?.focus(), 40);
      }
    } else {
      setHighlightedIndex(-1);
      setSearch("");
    }
  }, [open, isSearchable]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (!open || highlightedIndex < 0 || !optionListRef.current) return;
    const items = optionListRef.current.querySelectorAll<HTMLElement>("[data-select-item]");
    const target = items[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open]);

  // Selection handler
  const handleSelect = (val: string) => {
    setInternalVal(val);
    setOpen(false);
    setSearch("");

    // Update hidden select for HTML form and React Hook Form
    if (hiddenSelectRef.current) {
      hiddenSelectRef.current.value = val;
      const nativeEvent = new Event("change", { bubbles: true });
      hiddenSelectRef.current.dispatchEvent(nativeEvent);
    }

    if (onChange) {
      const syntheticEvent = {
        target: { name: name || "", value: val },
        currentTarget: { name: name || "", value: val },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(syntheticEvent);
    }

    triggerRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "Tab") {
      setOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : -1,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0
          ? (prev - 1 + filteredOptions.length) % filteredOptions.length
          : -1,
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const item = filteredOptions[highlightedIndex];
        if (!item.disabled) {
          handleSelect(item.value);
        }
      }
    }
  };

  // Class detection for flexible container heights & fonts
  const hasCustomHeight = /\bh-\S+/.test(className || "");
  const hasCustomText = /\btext-\S+/.test(className || "");

  return (
    <div
      className={cx(
        "relative",
        className?.includes("w-") ? "" : "w-full",
        className?.includes("flex-1") ? "flex-1" : "",
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native select for standard forms & React Hook Form */}
      <select
        ref={(el) => {
          hiddenSelectRef.current = el;
          if (typeof forwardedRef === "function") {
            forwardedRef(el);
          } else if (forwardedRef) {
            forwardedRef.current = el;
          }
        }}
        id={selectId}
        name={name}
        value={internalVal}
        onChange={(e) => {
          setInternalVal(e.target.value);
          onChange?.(e);
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none absolute inset-0 opacity-0"
        {...rest}
      >
        {parsedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {typeof opt.label === "string" ? opt.label : opt.value}
          </option>
        ))}
      </select>

      {/* Styled Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${selectId}-dropdown`}
        className={cx(
          "group flex w-full items-center justify-between rounded-[10px] border bg-surface px-3 text-left transition-all duration-150",
          hasCustomHeight ? "h-full py-1.5" : "h-10",
          hasCustomText ? "" : "text-[13.5px]",
          open
            ? "border-brand-500 ring-2 ring-brand-500/25 shadow-xs"
            : "border-edge hover:border-gray-300 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25",
          disabled && "cursor-not-allowed opacity-50 bg-gray-50",
        )}
      >
        <span
          className={cx(
            "truncate font-medium",
            !selectedOption && placeholder ? "text-faint" : "text-ink",
          )}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={cx(
            "ml-2 h-4 w-4 shrink-0 text-sub transition-transform duration-200 group-hover:text-ink",
            open && "rotate-180 text-brand-600",
          )}
        />
      </button>

      {/* Floating Popover via Portal to escape any overflow clipping */}
      {open &&
        createPortal(
          <div
            id={`${selectId}-dropdown`}
            ref={popoverRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
              zIndex: 99999,
            }}
            className="anim-scale-in flex max-h-80 flex-col rounded-xl border border-edge bg-surface p-1 shadow-[0_10px_28px_-4px_rgba(0,0,0,0.14),0_6px_12px_-4px_rgba(0,0,0,0.08)] backdrop-blur-sm"
          >
            {/* Quick search if > 7 options or searchable */}
            {isSearchable && (
              <div className="sticky top-0 z-10 border-b border-edgesoft bg-surface/95 px-1.5 py-1.5 backdrop-blur-sm">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sub" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder="Tìm kiếm..."
                    className="h-8 w-full rounded-lg border border-edge bg-gray-50/80 pl-8 pr-2.5 text-[12.5px] text-ink placeholder:text-faint focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div ref={optionListRef} className="overflow-y-auto py-1 max-h-60 scroll-smooth">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-[12.5px] text-sub">
                  Không tìm thấy lựa chọn phù hợp
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === internalVal;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={opt.value}
                      data-select-item
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      role="option"
                      aria-selected={isSelected}
                      className={cx(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                        isSelected
                          ? "bg-blue-50/90 font-bold text-brand-700"
                          : isHighlighted
                          ? "bg-gray-100/90 text-ink font-medium"
                          : "font-medium text-ink hover:bg-gray-100/70",
                        opt.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check className="ml-2 h-4 w-4 shrink-0 text-brand-600 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
