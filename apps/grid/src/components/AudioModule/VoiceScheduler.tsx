import { ModuleType } from "@blibliki/engine";
import { ModuleComponent } from ".";
import Container from "./Container";

const VoiceScheduler: ModuleComponent<ModuleType.VoiceScheduler> = () => {
  return <Container>Voice scheduler</Container>;
};

export default VoiceScheduler;
