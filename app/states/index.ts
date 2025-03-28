import { atom } from 'recoil';

export * from './userState';
export * from './printerState';
export * from './productState';
export * from './orderState';
export * from './categoryState';
export * from './tableState';
export * from './warehouseState';
// Thêm vào file states/index.ts
export const orderScreenRefreshAtom = atom({
    key: 'orderScreenRefreshAtom',
    default: false
  });