import { Device } from "react-native-ble-plx";
import { atom, selector } from "recoil";

export const connectedDevice = atom<Device[]>({
  key: "connectedDevice",
  default: [],
});
export const foundDevice = atom<Device[]>({
  key: "foundDevice",
  default: [],
});
export const deviceScan = atom({
  key: "scan_printer",
  default: false,
});
