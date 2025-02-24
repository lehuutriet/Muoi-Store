import { atom, atomFamily, selector } from "recoil";

interface Table {
  $id: string;
  name: string;
}

export const allTablesAtom = atom<Table[]>({
  key: "allTables",
  default: [],
});

export const tableIdsAtom = atom<string[]>({
  key: "tableIds",
  default: [],
});

export const tableAtomFamily = atomFamily<Table, string>({
  key: "tableAtomFamily",
  default: {
    $id: "",
    name: "",
  },
});
