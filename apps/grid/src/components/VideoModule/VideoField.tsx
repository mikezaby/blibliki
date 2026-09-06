import type { EnumProp } from "@blibliki/engine";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@blibliki/ui";
import type { PropSchema } from "@blibliki/video-engine";
import {
  InputField,
  SelectField,
} from "@/components/AudioModule/attributes/Field";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { updateVideoModuleProps } from "@/video/videoPatchSlice";

type Props = {
  moduleId: string;
  prop: string;
  schema: PropSchema;
  value: unknown;
};

export default function VideoField({ moduleId, prop, schema, value }: Props) {
  const dispatch = useAppDispatch();
  const audioModules = useAppSelector(modulesSelector.selectAll);
  const onChange = (next: unknown) => {
    dispatch(updateVideoModuleProps({ id: moduleId, props: { [prop]: next } }));
  };

  if (schema.kind === "enum") {
    return (
      <SelectField
        value={value as string}
        schema={schema as EnumProp<string>}
        onChange={onChange}
      />
    );
  }
  if (schema.kind === "number") {
    return (
      <InputField value={value as number} schema={schema} onChange={onChange} />
    );
  }
  if (schema.kind === "audioModule") {
    const options = audioModules.filter(
      (m) =>
        !schema.moduleType || (m.moduleType as string) === schema.moduleType,
    );

    return (
      <Select value={value as string} onValueChange={onChange}>
        <SelectTrigger aria-label={schema.label} className="min-w-32">
          <SelectValue placeholder={schema.label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return null;
}
