// Trong file states.ts
import { atom, atomFamily, selector } from "recoil";
export const allWarehouseItemsAtom = atom<any[]>({
  key: "allWarehouseItemsState",
  default: [],
});

export const warehouseIdsAtom = atom<string[]>({
  key: "warehouseIdsState",
  default: [],
});

export const warehouseItemAtomFamily = atomFamily<any, string>({
  key: "warehouseItemState",
  default: {},
});
