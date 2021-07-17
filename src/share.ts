import {AxiosResponse} from 'axios';
import {Result} from 'oracledb';

//url for category
export const baseCategroyUrl =
  'https://api.samsclub.cn/api/v1/sams/goods-portal/grouping/queryFirstLevel';
// url for sub category
export const subCategroyUrl =
  'https://api.samsclub.cn/api/v1/sams/goods-portal/grouping/queryChildren';
// url for product
export const productUrl =
  'https://api.samsclub.cn/api/v1/sams/goods-portal/grouping/list';

export function arrayIsnotEmty(array: any[]): boolean {
  return array.length ? true : false;
}

function camelToUnderscore(key: string) {
  return key.replace(/([A-Z])/g, '_$1').toUpperCase();
}

export function camelToDB(original: CategoryDB | ProductDB | CTPDB | PTPDB) {
  const newObject = {} as DTO;

  for (const key in original) {
    newObject[camelToUnderscore(key)] = original[key as keyof typeof original];
  }
  return newObject;
}

// source chengdu sams shop
const baseCategroyPost_CD = {
  storeCategoryList: [
    {storeId: '4839', storeType: '2'},
    {storeId: '6724', storeType: '4'},
    {storeId: '9999', storeType: '8'},
  ],
};

const baseCategroyPost_CQ = {
  storeCategoryList: [
    {storeId: '6513', storeType: '2'},
    {storeId: '6759', storeType: '4'},
    {storeId: '9999', storeType: '8'},
  ],
};
const baseCategroyPost_GZ = {
  storeCategoryList: [
    {storeId: '4801', storeType: '2'},
    {storeId: '6641', storeType: '4'},
    {storeId: '9999', storeType: '8'},
  ],
};
const baseCategroyPost_BJ = {
  storeCategoryList: [
    {storeId: '4788', storeType: '2'},
    {storeId: '6650', storeType: '4'},
    {storeId: '9999', storeType: '8'},
  ],
};

export enum baseArrayIndex {
  'CD',
  'CQ',
  'GZ',
  'BJ',
}

export const baseArray = [
  baseCategroyPost_CD,
  baseCategroyPost_CQ,
  baseCategroyPost_GZ,
  baseCategroyPost_BJ,
];

export interface DTO {
  [index: string]: string | number;
}

export interface CategoryDB {
  title: string;
  parent: number;
  layer: number;
  groupingId: number;
  imageUrl?: string;
  quantity: number;
}

export interface ProductDB {
  spuId: number;
  title: string;
  imageUrl: string;
  priceCd: string;
  priceCq: string;
  priceBj: string;
  priceGz: string;
  rateCd: number;
  rateCq: number;
  rateBj: number;
  rateGz: number;
  available: number;
}

export interface CTPDB {
  category: number;
  product: number;
}

export interface PTPDB {
  price: string;
  product: number;
}

export interface CategorySAMS {
  groupingId: string;
  title: string;
  level: number;
  image?: string;
  children: CategorySAMS[];
}

export interface ProductSAMS {
  spuId: string;
  title: string;
  image: string;
  isAvailable: boolean;
  priceInfo: [
    {
      price: string;
    }
  ];
}

export interface PriceMapDB {
  priceCd: string;
  priceCq: string;
  priceBj: string;
  priceGz: string;
  available: number;
}

// type CamelCase<T extends string> = T extends `${infer A}_${infer B}`
//   ? `${Lowercase<A>}${Capitalize<Lowercase<B>>}`
//   : Lowercase<T>;
type KebabCase<T extends string> = T extends `${infer S1}${infer S2}`
  ? S2 extends Capitalize<S2>
    ? `${Uppercase<S1>}_${KebabCase<S2>}`
    : never
  : Uppercase<T>;

export type ReturnDB = Pick<Result<any>, 'rows'>;
export type SamsResponse = Pick<AxiosResponse, 'data'>;
// export type DBtoCamelCase<T> = {
//   [P in keyof T as `${CamelCase<P extends string ? P : never>}`]: T[P];
// };
export type CamelCasetoDB<T> = {
  [P in keyof T as `${KebabCase<P extends string ? P : never>}`]: T[P];
};
