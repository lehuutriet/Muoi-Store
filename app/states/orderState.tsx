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
  couponCode?: string;
  couponDiscount?: number;
}

export const currentOrderAtom = atom<{
  $id: string;
  note: string;
  table: string;
  location?: string;
  discount: number;
  subtract: number;
  total: number;
  date: Date;
  order: OrderItem[];
  couponCode?: string;
  couponDiscount?: number;
  customer?: string;
  customerName?: string;
  customerPhone?: string;
  promotionId?: string;
  promotionDiscount?: number;
}>({
  key: "currentOrder",
  default: {
    $id: "",
    note: "",
    table: "",
    location: "dine-in",
    discount: 0,
    subtract: 0,
    total: 0,
    date: new Date(),
    order: [],
    couponCode: undefined,
    couponDiscount: 0,
    customer: undefined,
    customerName: undefined,
    customerPhone: undefined,
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
