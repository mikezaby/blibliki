import { InstrumentPerformance } from "@blibliki/instrument/react";
import { useState } from "react";
import {
  loadInstrumentDocument,
  saveInstrumentDocument,
} from "./instrumentStore";

// The device is the storage: the controller's save and discard commands write
// to and read back from localStorage, standing in for grid's Firestore.
export default function App() {
  const [document] = useState(() => loadInstrumentDocument(localStorage));

  return (
    <InstrumentPerformance
      name={document.name}
      document={document}
      onPersist={(action, nextDocument) => {
        if (action === "saveDraft") {
          saveInstrumentDocument(localStorage, nextDocument);

          return {
            notice: {
              title: "SAVE COMPLETE",
              message: "Stored on device",
              tone: "success",
            },
          };
        }

        return {
          document: loadInstrumentDocument(localStorage),
          notice: {
            title: "DRAFT DISCARDED",
            message: "Reloaded from device",
            tone: "success",
          },
        };
      }}
    />
  );
}
