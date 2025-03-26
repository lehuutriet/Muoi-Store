import { atom, atomFamily, selector } from "recoil";

export const userAtom = atom({
  key: "userState",
  default: {
    id: "",
    PUSH_TOKEN: "",
    STORE_NAME: "",
    WIFI: "",
    NAME: "",
    PHONE: "",
    ADDRESS: "",
  },
});
