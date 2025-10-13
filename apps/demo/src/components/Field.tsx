import { PropDefinition } from "@blibliki/engine";
import { assertNever, notImplemented } from "@blibliki/utils";

type FieldProps<T extends string | number | boolean | (string | number)[]> = {
  name: string;
  value?: T;
  schema: PropDefinition<T> | undefined;
  onChange: (value: T) => void;
};

const Field = <T extends string | number | boolean | (string | number)[]>({
  name,
  value,
  schema,
  onChange,
}: FieldProps<T>) => {
  if (!schema) return null;

  const label = schema.label ?? name;

  switch (schema.kind) {
    case "number":
      return (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <input
            type="range"
            value={value as number}
            min={schema.min}
            max={schema.max}
            step={schema.step ?? 0.01}
            onChange={(e) => {
              onChange(Number(e.target.value) as T);
            }}
            className="w-full"
          />
        </div>
      );

    case "enum":
      return (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <select
            value={value as number | string}
            onChange={(e) => {
              onChange(e.target.value as T);
            }}
            className="w-full px-2 py-1 border rounded"
          >
            {schema.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "string":
      return (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <input
            type="text"
            value={value as string}
            onChange={(e) => {
              onChange(e.target.value as T);
            }}
            className="w-full px-2 py-1 border rounded"
          />
        </div>
      );

    case "boolean":
      return (
        <div className="mb-3 flex items-center">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => {
              onChange(e.target.checked as T);
            }}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-700">{label}</label>
        </div>
      );
    case "array":
      return notImplemented();

    default:
      return assertNever(schema);
  }
};

export default Field;
