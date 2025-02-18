import { atom, atomFamily, selector } from "recoil";

export const allCategoryAtom = atom({
  key: "allCategory",
  default: [],
});

export const categoryIdsAtom = atom({
  key: "categoryIds",
  default: [],
});

export const categoryAtomFamily = atomFamily({
  key: "categoryAtomFamily",
  default: {
    $id: "",
    name: "",
  },
});
