import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ModalProps {
  modalName: string | null;
  isOpen: boolean;
}

export const modalSlice = createSlice({
  name: "modal",
  initialState: {
    modalName: null,
    isOpen: false,
  } as ModalProps,
  reducers: {
    open: (state, action: PayloadAction<string>) => {
      state.modalName = action.payload;
      state.isOpen = true;
    },
    close: (state, action: PayloadAction<string>) => {
      state.modalName = action.payload;
      state.isOpen = false;
    },
  },
});

export const { open, close } = modalSlice.actions;

export default modalSlice.reducer;
