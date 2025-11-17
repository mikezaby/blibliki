import { type MidiMapping, ModuleType, moduleSchemas } from "@blibliki/engine";
import { useEffect } from "react";
import Select from "@/components/Select";
import { useAppSelector, useAppDispatch } from "@/hooks";
import { ModuleComponent } from ".";
import { Button, Input } from "../ui";
import Container from "./Container";
import { initialize } from "./MidiDeviceSelector/midiDevicesSlice";
import { selectAllExceptSelf } from "./modulesSlice";

const MidiMapper: ModuleComponent<ModuleType.MidiMapper> = (props) => {
  const {
    id,
    updateProp,
    props: { mappings },
  } = props;

  const dispatch = useAppDispatch();
  const modules = useAppSelector((state) => selectAllExceptSelf(state, id));

  useEffect(() => {
    dispatch(initialize());
  }, [dispatch]);

  const onAdd = () => {
    updateModule([...mappings, {}]);
  };

  const updateModule = (
    updatedMappings: Partial<MidiMapping<ModuleType>>[],
  ) => {
    updateProp("mappings")(updatedMappings);
  };

  const updateMappedCC = ({ cc, index }: { cc: number; index: number }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      cc,
    };
    updateModule(updatedMappings);
  };

  const updateMappedAutoAssign = ({ index }: { index: number }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      autoAssign: true,
    };
    updateModule(updatedMappings);
  };

  const updateMappedModuleId = ({
    id,
    index,
  }: {
    id: string;
    index: number;
  }) => {
    const updatedMappings = [...mappings];
    const module = modules.find(({ id: mId }) => mId === id);
    if (!module) throw Error(`Module with id ${id} not exists`);

    updatedMappings[index] = {
      ...updatedMappings[index],
      moduleId: module.id,
      moduleType: module.moduleType,
    };
    updateModule(updatedMappings);
  };

  const updateMappedProp = ({
    propName,
    index,
  }: {
    propName: string;
    index: number;
  }) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      propName,
    };
    updateModule(updatedMappings);
  };

  return (
    <Container className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {mappings.map((mapping, i) => (
          <div key={i} className="flex gap-4">
            <Input
              className="w-20"
              type="string"
              value={mapping.autoAssign ? "Mapping..." : mapping.cc}
              placeholder="cc"
              readOnly
              onClick={() => {
                updateMappedAutoAssign({ index: i });
              }}
              onChange={(e) => {
                updateMappedCC({
                  cc: Number(e.currentTarget.value),
                  index: i,
                });
              }}
            />
            <Select
              label="Select module"
              value={mapping.moduleId ?? ""}
              options={modules}
              onChange={(value: string) => {
                updateMappedModuleId({ id: value, index: i });
              }}
            />
            <Select
              label="Select prop"
              value={mapping.propName ?? ""}
              options={
                mapping.moduleType
                  ? Object.keys(moduleSchemas[mapping.moduleType])
                  : []
              }
              disabled={!mapping.moduleType}
              onChange={(value: string) => {
                updateMappedProp({ propName: value, index: i });
              }}
            />
          </div>
        ))}
      </div>

      <Button onClick={onAdd}>Add new mapping</Button>
    </Container>
  );
};

export default MidiMapper;
