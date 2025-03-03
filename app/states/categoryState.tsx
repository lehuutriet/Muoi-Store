import { atom, atomFamily, selector } from "recoil";
interface Category {
  $id: string;
  name: string;
}
export const allCategoryAtom = atom<Category[]>({
  key: "allCategoryAtom",
  default: [],
});

export const categoryIdsAtom = atom<string[]>({
  key: "categoryIds",
  default: [],
});

export const categoryAtomFamily = atomFamily<Category, string>({
  key: "categoryAtomFamily",
  default: {
    $id: "",
    name: "",
  },
});
