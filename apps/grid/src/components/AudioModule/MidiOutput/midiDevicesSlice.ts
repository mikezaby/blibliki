import { Engine, IMidiDevice, MidiPortState } from "@blibliki/engine";
import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { RootState, AppDispatch } from "@/store";

const devicesAdapter = createEntityAdapter<IMidiDevice>({});

export const midiOutputDevicesSlice = createSlice({
  name: "midiOutputDevices",
  initialState: devicesAdapter.getInitialState(),
  reducers: {
    setDevices: (state, action) => devicesAdapter.setAll(state, action),
    addDevice: (state, action) => devicesAdapter.addOne(state, action),
    removeDevice: (state, action) => devicesAdapter.removeOne(state, action),
    updateDevice: (state, action) => devicesAdapter.updateOne(state, action),
  },
});

const { setDevices, addDevice, removeDevice } = midiOutputDevicesSlice.actions;

export const initialize =
  () => (dispatch: AppDispatch, getState: () => RootState) => {
    const any = devicesSelector.selectAll(getState()).length;
    if (any) return;

    const devices = Array.from(
      Engine.current.midiDeviceManager.outputDevices.values(),
    );
    dispatch(setDevices(devices.map((d) => d.serialize())));

    Engine.current.midiDeviceManager.addListener((device) => {
      if (device.type === "input") return;

      if (device.state === MidiPortState.disconnected) {
        dispatch(removeDevice(device.id));
      } else {
        dispatch(addDevice(device.serialize()));
      }
    });
  };

export const devicesSelector = devicesAdapter.getSelectors(
  (state: RootState) => state.midiOutputDevices,
);

export default midiOutputDevicesSlice.reducer;
