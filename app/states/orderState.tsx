import {
  atom,
  atomFamily,
  selector,
  selectorFamily,
  DefaultValue,
} from "recoil";

export const currentOrderAtom = atom({
  key: "currentOrder",
  default: {
    $id: "",
    note: "",
    table: "",
    discount: 0,
    subtract: 0,
    total: 0,
    date: new Date(),
    order: [],
  },
});

export const allOrdersAtom = atom({
  key: "allOrders",
  default: [],
});

export const orderIdsAtom = atom({
  key: "orderIds",
  default: [],
});

export const orderAtomFamily = atomFamily({
  key: "orderAtomFamily",
  default: {
    $id: "",
    note: "",
    table: "",
    discount: 0,
    subtract: 0,
    total: 0,
    date: new Date(),
    order: [],
  },
});
