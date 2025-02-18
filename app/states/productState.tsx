import {
  atom,
  atomFamily,
  selector,
  selectorFamily,
  DefaultValue,
} from "recoil";

import { currentOrderAtom } from "./orderState";

export const allProductsAtom = atom({
  key: "allProducts",
  default: [],
});

export const productIdsAtom = atom({
  key: "productIds",
  default: [],
});

export const productAtomFamily = atomFamily({
  key: "productAtomFamily",
  default: {
    $id: "",
    name: "",
    photo: "",
    photoUrl: "",
    price: 0,
    cost: 0,
    category: "",
    count: 0,
    description: "",
  },
});

export const productAtomFamilySelector = selectorFamily({
  key: "productAtomFamilySelector",
  get:
    (id) =>
    ({ get }) => {
      const currentOrder = get(currentOrderAtom);

      const item = currentOrder.order.find((item) => item.$id === id);
      if (item && item.count > 0) {
        return item;
      } else {
        return get(productAtomFamily(id));
      }
    },
  set:
    (id) =>
    ({ get, set, reset }, itemInfo) => {
      if (itemInfo instanceof DefaultValue) {
        reset(productAtomFamily(id));
        // const productIds = get(productIdsAtom);
        // productIds.forEach((id) => reset(productAtomFamily(id)));
      } else {
        set(productAtomFamily(id), itemInfo);
        const currentOrder = get(currentOrderAtom);
        let newOrder = [...currentOrder.order].filter(
          (item) => item.$id !== itemInfo.$id
        );
        newOrder.push(itemInfo);
        newOrder = newOrder.filter((item) => item.count > 0);
        // console.log("newOrder::", itemInfo, newOrder);
        set(currentOrderAtom, { ...currentOrder, order: newOrder });
      }
    },
});
