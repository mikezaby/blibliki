import {
  moduleSchemas as originalModuleSchemas,
  ModuleType,
  ModuleTypeToPropsMapping,
  ModulePropSchema,
  PropSchema,
  IModuleSerialize,
  IPolyModuleSerialize,
} from "@blibliki/engine";
import { deepmerge, toPrimitive } from "@blibliki/utils";
import { useEngineStore } from "../store/useEngineStore";
import Field from "./Field";

type ModuleCardProps<T extends ModuleType> = {
  module: IModuleSerialize<T> | IPolyModuleSerialize<T>;
};

const overrides: {
  [K in ModuleType]?: {
    [P in keyof ModuleTypeToPropsMapping[K]]?: Partial<
      ModulePropSchema<ModuleTypeToPropsMapping[K]>[P]
    >;
  };
} = {
  [ModuleType.Gain]: {
    gain: {
      min: 0,
      max: 1,
    },
  },
};

const moduleSchemas = deepmerge(
  originalModuleSchemas,
  overrides,
) as typeof originalModuleSchemas;

function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

const ModuleCard = <T extends ModuleType>({ module }: ModuleCardProps<T>) => {
  const { updateModule } = useEngineStore();
  const schema = moduleSchemas[module.moduleType];

  const onChange =
    (key: keyof ModuleTypeToPropsMapping[T]) =>
    (value: string | number | boolean | string[] | number[]) => {
      const { id, moduleType } = module;
      const props = { [key]: value } as ModuleTypeToPropsMapping[T];

      updateModule({
        id,
        moduleType,
        changes: { props },
      });
    };

  return (
    <div className="border p-4 rounded-xl shadow-md bg-white w-64">
      <h2 className="font-bold text-lg mb-2">
        {module.name} ({module.moduleType})
      </h2>

      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Props</h3>
        {typedEntries(module.props).map(([key, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          const fieldSchema = (schema as any)[key] as PropSchema | undefined;

          return (
            <Field
              key={key as string}
              name={key as string}
              value={toPrimitive(value)}
              schema={fieldSchema}
              onChange={onChange(key)}
            />
          );
        })}
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Inputs</h3>
        <ul className="text-xs text-gray-600 list-disc list-inside">
          {module.inputs.map((input) => (
            <li key={input.id}>
              {input.name} ({input.ioType})
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700">Outputs</h3>
        <ul className="text-xs text-gray-600 list-disc list-inside">
          {module.outputs.map((output) => (
            <li key={output.id}>
              {output.name} ({output.ioType})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ModuleCard;
