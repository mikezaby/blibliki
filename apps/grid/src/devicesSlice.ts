import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Device, { IDevice } from "@/models/Device";
import { addNotification } from "@/notificationsSlice";
import { AppDispatch } from "@/store";

type DevicesState = {
  devices: IDevice[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string;
};

const initialState: DevicesState = {
  devices: [],
  status: "idle",
};

export const devicesSlice = createSlice({
  name: "Devices",
  initialState,
  reducers: {
    setDevices: (state, action: PayloadAction<IDevice[]>) => {
      state.devices = action.payload;
      state.status = "succeeded";
    },
    addDevice: (state, action: PayloadAction<IDevice>) => {
      state.devices.push(action.payload);
    },
    updateDevice: (state, action: PayloadAction<IDevice>) => {
      const index = state.devices.findIndex((d) => d.id === action.payload.id);
      if (index !== -1) {
        state.devices[index] = action.payload;
      }
    },
    removeDevice: (state, action: PayloadAction<string>) => {
      state.devices = state.devices.filter((d) => d.id !== action.payload);
    },
    setStatus: (
      state,
      action: PayloadAction<"idle" | "loading" | "succeeded" | "failed">,
    ) => {
      state.status = action.payload;
    },
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },
  },
});

export const loadDevices =
  (userId: string) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));

    try {
      const devices = await Device.findByUserId(userId);
      dispatch(setDevices(devices.map((d) => d.serialize())));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(setStatus("failed"));
      dispatch(setError(errorMessage));

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to load devices",
          message: errorMessage,
          duration: 5000,
        }),
      );

      throw error;
    }
  };

export const saveDevice =
  (deviceData: Omit<IDevice, "id"> & { id?: string }) =>
  async (dispatch: AppDispatch) => {
    try {
      const device = new Device(deviceData);
      await device.save();

      const serialized = device.serialize();

      if (deviceData.id) {
        dispatch(updateDevice(serialized));
        dispatch(
          addNotification({
            type: "success",
            title: "Device updated",
            message: `"${device.name}" has been updated.`,
            duration: 3000,
          }),
        );
      } else {
        dispatch(addDevice(serialized));
        dispatch(
          addNotification({
            type: "success",
            title: "Device added",
            message: `"${device.name}" has been added.`,
            duration: 3000,
          }),
        );
      }

      return device;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to save device",
          message: errorMessage,
          duration: 5000,
        }),
      );

      throw error;
    }
  };

export const deleteDevice = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const device = await Device.find(id);
    const deviceName = device.name;
    await device.delete();

    dispatch(removeDevice(id));
    dispatch(
      addNotification({
        type: "success",
        title: "Device deleted",
        message: `"${deviceName}" has been deleted.`,
        duration: 3000,
      }),
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    dispatch(
      addNotification({
        type: "error",
        title: "Failed to delete device",
        message: errorMessage,
        duration: 5000,
      }),
    );

    throw error;
  }
};

export const {
  setDevices,
  addDevice,
  updateDevice,
  removeDevice,
  setStatus,
  setError,
} = devicesSlice.actions;

export default devicesSlice.reducer;
