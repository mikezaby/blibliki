import type { EnumProp, PropSchema } from "@blibliki/engine";
import { Stack } from "@blibliki/ui";
import {
  InputField,
  SelectField,
} from "@/components/AudioModule/attributes/Field";
import { useAppDispatch } from "@/hooks";
import { updateVideoModuleProps } from "@/video/videoPatchSlice";

type Props = {
  moduleId: string;
  prop: string;
  schema: PropSchema;
  value: unknown;
};

export default function VideoField({ moduleId, prop, schema, value }: Props) {
  const dispatch = useAppDispatch();
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
      <Stack gap={1}>
        <InputField
          value={value as number}
          schema={schema}
          onChange={onChange}
        />
      </Stack>
    );
  }

  return null;
}
