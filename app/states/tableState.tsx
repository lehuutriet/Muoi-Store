import { atom, atomFamily, selector } from "recoil";

export const allTablesAtom = atom({
  key: "allTables",
  default: [],
});

export const tableIdsAtom = atom({
  key: "tableIds",
  default: [],
});

export const tableAtomFamily = atomFamily({
  key: "tableAtomFamily",
  default: {
    $id: "",
    name: "",
  },
});
