import { ModuleType } from "@blibliki/engine";
import { OptionSelect } from "@blibliki/ui";
import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks";
import { ModuleComponent } from "..";
import Container from "../Container";
import { initialize, devicesSelector } from "./midiDevicesSlice";

const MidiInput: ModuleComponent<ModuleType.MidiInput> = (props) => {
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
      <OptionSelect
        label="Select MIDI device"
        value={selectedId ?? ""}
        options={devices}
        onChange={updateProp("selectedId")}
      />
    </Container>
  );
};

export default MidiInput;
