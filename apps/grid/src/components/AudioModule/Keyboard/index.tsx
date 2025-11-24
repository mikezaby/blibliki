import { ModuleType } from "@blibliki/engine";
import { useState } from "react";
import { ModuleComponent } from "..";
import Octave from "./Octave";

const Keyboard: ModuleComponent<ModuleType.VirtualMidi> = (props) => {
  const { id, props: moduleProps } = props;

  const [triggerable, setTriggerable] = useState(false);

  const enableTriggering = () => {
    setTriggerable(true);
  };
  const disableTriggering = () => {
    setTriggerable(false);
  };

  return (
    <div
      onPointerDown={enableTriggering}
      onPointerUp={disableTriggering}
      onPointerLeave={disableTriggering}
    >
      <Octave
        id={id}
        props={moduleProps}
        triggerable={triggerable}
        octave={2}
      />
      <Octave
        id={id}
        props={moduleProps}
        triggerable={triggerable}
        octave={3}
      />
      <Octave
        id={id}
        props={moduleProps}
        triggerable={triggerable}
        octave={4}
      />
    </div>
  );
};

export default Keyboard;
