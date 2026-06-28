import { Engine, moduleSchemas, ModuleType } from "@blibliki/engine";
import { Button, Stack, Surface, Text } from "@blibliki/ui";
import { useEffect, useState } from "react";
import { useModuleState } from "@/hooks";
import { ModuleComponent } from ".";
import { SelectField } from "./attributes/Field";

const getRecorder = (id: string) => {
  const module = Engine.current.findModule(id);
  if (module.moduleType !== ModuleType.AudioRecorder)
    throw Error("Not an AudioRecorder module");
  return module;
};

const AudioRecorder: ModuleComponent<ModuleType.AudioRecorder> = (props) => {
  const {
    id,
    updateProp,
    props: { quantize },
  } = props;

  const quantizeSchema = moduleSchemas[ModuleType.AudioRecorder].quantize;
  const { isRecording = false, durationSeconds = 0 } = useModuleState(
    id,
    ModuleType.AudioRecorder,
  );

  const [url, setUrl] = useState<string | null>(null);

  // Receive the finished recording as a downloadable object URL.
  useEffect(() => {
    let currentUrl: string | null = null;
    getRecorder(id).onRecordingComplete = (blob) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(blob);
      setUrl(currentUrl);
    };

    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [id]);

  const toggle = () => {
    const recorder = getRecorder(id);
    if (isRecording) recorder.stopRecording();
    else recorder.record();
  };

  return (
    <Stack gap={4} className="w-56">
      <SelectField
        value={quantize}
        schema={quantizeSchema}
        onChange={updateProp("quantize")}
        className="w-full"
      />

      <Button
        color={isRecording ? "error" : "primary"}
        onClick={toggle}
        className="w-full"
      >
        {isRecording ? "Stop" : "Record"}
      </Button>

      <Text size="sm" tone="muted">
        {durationSeconds.toFixed(1)}s
      </Text>

      {url && (
        <Surface tone="panel" border="subtle" radius="md" className="p-2">
          <Stack gap={2}>
            <audio src={url} controls className="w-full" />
            <a href={url} download="recording.wav">
              <Text size="sm" tone="info">
                Download .wav
              </Text>
            </a>
          </Stack>
        </Surface>
      )}
    </Stack>
  );
};

export default AudioRecorder;
