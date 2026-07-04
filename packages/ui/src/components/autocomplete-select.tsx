import type { ComponentProps } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type AutocompleteSelectValue = string | number;
export type AutocompleteSelectOption = {
  name: string;
  value: AutocompleteSelectValue;
  searchText?: string;
};
type AutocompleteSelectIdOption = {
  id: string;
  name: string;
  searchText?: string;
};
export type AutocompleteSelectInput =
  | readonly string[]
  | readonly number[]
  | readonly AutocompleteSelectOption[]
  | readonly AutocompleteSelectIdOption[];

export interface AutocompleteSelectProps<
  T extends AutocompleteSelectValue | undefined,
> {
  value: T;
  options: AutocompleteSelectInput;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  onChange: (value: T) => void;
}

function SelectChevronDownIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isValueOption(value: unknown): value is AutocompleteSelectOption {
  return Boolean(
    value &&
    typeof value === "object" &&
    "name" in value &&
    "value" in value &&
    (typeof (value as { value: unknown }).value === "string" ||
      typeof (value as { value: unknown }).value === "number"),
  );
}

function isIdOption(value: unknown): value is AutocompleteSelectIdOption {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "name" in value &&
    typeof (value as { id: unknown }).id === "string",
  );
}

function normalizeAutocompleteOptions(
  options: AutocompleteSelectInput,
): AutocompleteSelectOption[] {
  if (!options.length) return [];

  const first = options[0];
  if (typeof first === "string" || typeof first === "number") {
    return (options as readonly AutocompleteSelectValue[]).map((option) => ({
      name: option.toString(),
      value: option,
    }));
  }

  if (isValueOption(first)) {
    return Array.from(options as readonly AutocompleteSelectOption[]);
  }

  if (isIdOption(first)) {
    return (options as readonly AutocompleteSelectIdOption[]).map((option) => ({
      name: option.name,
      value: option.id,
      searchText: option.searchText,
    }));
  }

  return [];
}

function filterOptions(options: AutocompleteSelectOption[], search: string) {
  const tokens = search
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return options;
  }

  return options.filter((option) => {
    const searchText = `${option.name} ${option.value} ${
      option.searchText ?? ""
    }`.toLowerCase();

    return tokens.every((token) => searchText.includes(token));
  });
}

function AutocompleteSelect<T extends AutocompleteSelectValue | undefined>({
  value,
  options,
  label,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No options found",
  disabled = false,
  size = "md",
  className,
  triggerClassName,
  contentClassName,
  onChange,
}: AutocompleteSelectProps<T>) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contentPosition, setContentPosition] = useState<{
    top: number;
    left: number;
    width: number;
  }>();
  const normalizedOptions = useMemo(
    () => normalizeAutocompleteOptions(options),
    [options],
  );
  const filteredOptions = useMemo(
    () => filterOptions(normalizedOptions, search),
    [normalizedOptions, search],
  );
  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );
  const triggerLabel = label ?? placeholder;
  const displayValue = selectedOption?.name ?? placeholder;

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const updateContentPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      setContentPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updateContentPosition();
    window.addEventListener("resize", updateContentPosition);
    window.addEventListener("scroll", updateContentPosition, true);

    return () => {
      window.removeEventListener("resize", updateContentPosition);
      window.removeEventListener("scroll", updateContentPosition, true);
    };
  }, [open]);

  const content =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className={cn("ui-autocomplete-content", contentClassName)}
            role="presentation"
            style={{
              top: contentPosition?.top ?? 0,
              left: contentPosition?.left ?? 0,
              minWidth: contentPosition?.width,
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                close();
              }
            }}
          >
            <input
              aria-label={`Search ${triggerLabel}`}
              className="ui-input ui-input--size-sm ui-autocomplete-search"
              placeholder={searchPlaceholder}
              value={search}
              autoFocus
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
            <div
              id={`${id}-listbox`}
              role="listbox"
              aria-labelledby={`${id}-trigger`}
              className="ui-autocomplete-list"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className="ui-autocomplete-option"
                    onClick={() => {
                      onChange(option.value as T);
                      close();
                    }}
                  >
                    <span className="ui-select-item-text">{option.name}</span>
                  </button>
                ))
              ) : (
                <div className="ui-autocomplete-empty">{emptyText}</div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn("ui-autocomplete", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          close();
        }
      }}
    >
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        role="combobox"
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-label={triggerLabel}
        data-size={size}
        data-placeholder={selectedOption ? undefined : ""}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "ui-select-trigger ui-autocomplete-trigger",
          triggerClassName,
        )}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className="ui-select-value">{displayValue}</span>
        <SelectChevronDownIcon className="ui-select-chevron" />
      </button>
      {content}
    </div>
  );
}

export { AutocompleteSelect };
