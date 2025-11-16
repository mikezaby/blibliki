import { type MidiMapping, ModuleType, moduleSchemas } from "@blibliki/engine";
import { useEffect, useState } from "react";
import Select from "@/components/Select";
import { useAppSelector, useAppDispatch } from "@/hooks";
import { ModuleComponent } from ".";
import { Button, Input } from "../ui";
import Container from "./Container";
import {
  devicesSelector,
  initialize,
} from "./MidiDeviceSelector/midiDevicesSlice";
import { selectAllExceptSelf } from "./modulesSlice";

const MidiMapper: ModuleComponent<ModuleType.MidiMapper> = (props) => {
  const {
    id,
    updateProp,
    props: { selectedId, mappings },
  } = props;

  const dispatch = useAppDispatch();
  const devices = useAppSelector((state) => devicesSelector.selectAll(state));
  const modules = useAppSelector((state) => selectAllExceptSelf(state, id));

  const [localMappings, setLocalMappings] = useState<
    Partial<MidiMapping<ModuleType>>[]
  >([...mappings]);

  useEffect(() => {
    dispatch(initialize());
  }, [dispatch]);

  const onAdd = () => {
    setLocalMappings([...localMappings, {}]);
  };

  const updateModule = (
    updatedMappings: Partial<MidiMapping<ModuleType>>[],
  ) => {
    const newMappings = updatedMappings.filter(
      (m) => m.cc && m.moduleId && m.propName && m.moduleType,
    ) as MidiMapping<ModuleType>[];
    updateProp("mappings")(newMappings);
  };

  const updateMappedCC = ({ cc, index }: { cc: number; index: number }) => {
    const updatedMappings = [...localMappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      cc,
    };
    setLocalMappings(updatedMappings);
    updateModule(updatedMappings);
  };

  const updateMappedModuleId = ({
    id,
    index,
  }: {
    id: string;
    index: number;
  }) => {
    const updatedMappings = [...localMappings];
    const module = modules.find(({ id: mId }) => mId === id);
    if (!module) throw Error(`Module with id ${id} not exists`);

    updatedMappings[index] = {
      ...updatedMappings[index],
      moduleId: module.id,
      moduleType: module.moduleType,
    };
    setLocalMappings(updatedMappings);
    updateModule(updatedMappings);
  };

  const updateMappedProp = ({
    propName,
    index,
  }: {
    propName: string;
    index: number;
  }) => {
    const updatedMappings = [...localMappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      propName,
    };
    setLocalMappings(updatedMappings);
    updateModule(updatedMappings);
  };

  return (
    <Container className="flex flex-col gap-4">
      <Select
        label="Select MIDI device"
        value={selectedId ?? ""}
        options={devices}
        onChange={updateProp("selectedId")}
      />

      <div className="flex flex-col gap-4">
        {localMappings.map((mapping, i) => (
          <div key={i} className="flex gap-4">
            <Input
              className="w-20"
              type="string"
              value={mapping.cc}
              placeholder="cc"
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
