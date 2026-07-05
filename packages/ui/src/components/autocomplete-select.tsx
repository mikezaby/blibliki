import type { ComponentProps } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const content = open ? (
    // Rendered inline and absolutely positioned under the trigger so it stays
    // inside a Radix Dialog's scroll-lock allowlist and its transformed
    // containing block — a body portal can't be wheel-scrolled there, and
    // position: fixed would resolve against the dialog's transform.
    <div
      className={cn("ui-autocomplete-content", contentClassName)}
      role="presentation"
    >
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
              // Select before the input's blur can close the popup.
              onMouseDown={(event) => {
                event.preventDefault();
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
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className={cn("ui-autocomplete", className)}>
      <input
        ref={triggerRef}
        id={`${id}-trigger`}
        role="combobox"
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={triggerLabel}
        data-size={size}
        data-placeholder={open || selectedOption ? undefined : ""}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "ui-select-trigger ui-autocomplete-trigger",
          triggerClassName,
        )}
        disabled={disabled}
        placeholder={open ? searchPlaceholder : placeholder}
        value={open ? search : displayValue}
        onFocus={() => {
          if (!disabled) {
            setSearch("");
            setOpen(true);
          }
        }}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
            triggerRef.current?.blur();
          }
        }}
      />
      <SelectChevronDownIcon className="ui-select-chevron ui-autocomplete-chevron" />
      {content}
    </div>
  );
}

export { AutocompleteSelect };
