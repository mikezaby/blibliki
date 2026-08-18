import { Context } from "@blibliki/utils";
import { processorDefinitions } from "./definitions";
import { createProcessorBlobURL } from "./webProcessorBlob";

// Web/Node loader: package each cross-platform definition into a Blob-URL
// AudioWorklet module. Imported only by the browser entry (and the test setup),
// so the Blob-URL code never reaches the native bundle.
export async function loadWebProcessors(context: Context): Promise<void> {
  for (const definition of processorDefinitions) {
    await context.addModule(createProcessorBlobURL(definition));
  }
}
