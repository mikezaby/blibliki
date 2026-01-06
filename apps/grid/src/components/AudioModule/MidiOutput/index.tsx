import { ModuleType } from "@blibliki/engine";
import { useEffect } from "react";
import Select from "@/components/Select";
import { useAppSelector, useAppDispatch } from "@/hooks";
import { ModuleComponent } from "..";
import Container from "../Container";
import { initialize, devicesSelector } from "./midiDevicesSlice";

const MidiOutput: ModuleComponent<ModuleType.MidiOutput> = (props) => {
  const {
    updateProp,
    props: { selectedId },
  } = props;

  const dispatch = useAppDispatch();
  const devices = useAppSelector((state) => devicesSelector.selectAll(state));

  useEffect(() => {
    dispatch(initialize());
  }, [dispatch]);

  return (
    <Container>
      <Select
        label="Select MIDI device"
        value={selectedId ?? ""}
        options={devices}
        onChange={updateProp("selectedId")}
      />
    </Container>
  );
};

export default MidiOutput;
