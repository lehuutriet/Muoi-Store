import { atom, atomFamily, selector } from "recoil";

export const userAtom = atom({
  key: "userInfo",
  default: {
    id: "",
    PUSH_TOKEN: "",
    STORE_NAME: "",
    WIFI: "",
  },
});
