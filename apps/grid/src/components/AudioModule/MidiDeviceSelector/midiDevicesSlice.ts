import {
  Engine,
  MidiDevice,
  IMidiDevice,
  MidiPortState,
} from "@blibliki/engine";
import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { RootState, AppDispatch } from "@/store";

const devicesAdapter = createEntityAdapter<IMidiDevice>({});

export const midiDevicesSlice = createSlice({
  name: "midiDevices",
  initialState: devicesAdapter.getInitialState(),
  reducers: {
    setDevices: (state, action) => devicesAdapter.setAll(state, action),
    addDevice: (state, action) => devicesAdapter.addOne(state, action),
    removeDevice: (state, action) => devicesAdapter.removeOne(state, action),
    updateDevice: (state, action) => devicesAdapter.updateOne(state, action),
  },
});

const { setDevices, addDevice, removeDevice } = midiDevicesSlice.actions;

export const initialize =
  () => (dispatch: AppDispatch, getState: () => RootState) => {
    const any = devicesSelector.selectAll(getState()).length;
    if (any) return;

    const devices = Array.from(
      Engine.current.midiDeviceManager.devices.values(),
    );
    dispatch(setDevices(devices.map((d) => d.serialize())));

    Engine.current.midiDeviceManager.addListener((device: MidiDevice) => {
      if (device.state === MidiPortState.disconnected) {
        device.disconnect();
        dispatch(removeDevice(device.id));
      } else {
        dispatch(addDevice(device.serialize()));
      }
    });
  };

export const devicesSelector = devicesAdapter.getSelectors(
  (state: RootState) => state.midiDevices,
);

export default midiDevicesSlice.reducer;
