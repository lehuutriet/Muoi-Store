import {
  atom,
  atomFamily,
  selector,
  selectorFamily,
  DefaultValue,
} from "recoil";

export interface OrderItem {
  price: number;
  count: number;
  $id: string;
  name: string;
}

export interface CurrentOrderType {
  $id: string;
  note: string;
  table: string;
  discount: number;
  subtract: number;
  total: number;
  location?: string;
  date: Date;
  order: OrderItem[];
  customer: string;
  customerName: string;
  customerPhone: string;
}

export const currentOrderAtom = atom<CurrentOrderType>({
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
    customer: "",
    customerName: "",
    customerPhone: "",
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
