import OracleDB from '../oracledb';
import {OUT_FORMAT_OBJECT} from 'oracledb';
import {
  arrayIsnotEmty,
  ProductDB,
  ProductSAMS,
  PriceMapDB,
  CTPDB,
  camelToDB,
  CamelCasetoDB,
} from '../share';

const setProds = new Map<number, PriceMapDB>();

/**
 * post to db
 */
const postAllToDB = (data: any, sql: string) => {
  OracleDB.executeManyWithOptions(sql, data);
};

const searchInCTP = async (id: number) => {
  const sql = 'SELECT PRODUCT as "product" FROM CTP WHERE CATEGORY=:id';
  return await OracleDB.execute(
    sql,
    {id: id},
    {
      outFormat: OUT_FORMAT_OBJECT,
    }
  );
};

const insertInCTP = async (spuId: number, category: number) => {
  const sql = `INSERT INTO CTP(CATEGORY, PRODUCT) VALUES (${category}, ${spuId})`;
  return await OracleDB.execute(sql);
};

const insertInPrice = async (price: string, product: number, index: string) => {
  const sql = `INSERT INTO PTP_${index} (PRICE, PRODUCT) VALUES (${price}, ${product})`;
  return await OracleDB.execute(sql);
};

const updateInProduct = async (
  price: string,
  rate: number,
  id: number,
  index: string
) => {
  const sql = `UPDATE PRODUCT SET PRICE_${index} = ${price}, RATE_${index} = ${rate}, AVAILABLE = 1 where SPU_ID = ${id}`;
  return await OracleDB.execute(sql);
};

const updateOffLine = async (product: number) => {
  const sql = `UPDATE PRODUCT SET AVAILABLE = 0 where SPU_ID = ${product}`;
  return await OracleDB.execute(sql);
};

/**
 * Fetch all products
 */
const getAllProducts = async () => {
  const result = await OracleDB.execute(
    'SELECT SPU_ID AS "spuId", PRICE_CD AS "priceCd", PRICE_CQ AS "priceCq", PRICE_GZ AS "priceGz", PRICE_BJ AS "priceBj" FROM PRODUCT',
    {},
    {
      outFormat: OUT_FORMAT_OBJECT,
    }
  );
  const rows = result?.rows;
  if (rows && arrayIsnotEmty(rows)) {
    for (let i = 0; i < rows.length; i++) {
      setProds.set(parseInt(rows[i].spuId), {
        priceCd: rows[i].priceCd,
        priceGz: rows[i].priceGz,
        priceBj: rows[i].priceBj,
        priceCq: rows[i].priceCq,
      });
    }
  }
};

//对比产品价格
const PerformPriceCompare = (index: string, spuId: number, price: string) =>
  ({
    CD:
      Math.floor(
        (parseInt(setProds.get(spuId)!.priceCd) / parseInt(price)) * 100
      ) / 100,
    CQ:
      Math.floor(
        (parseInt(setProds.get(spuId)!.priceCq) / parseInt(price)) * 100
      ) / 100,
    GZ:
      Math.floor(
        (parseInt(setProds.get(spuId)!.priceGz) / parseInt(price)) * 100
      ) / 100,
    BJ:
      Math.floor(
        (parseInt(setProds.get(spuId)!.priceBj) / parseInt(price)) * 100
      ) / 100,
  }[index]);

//更新全局价格
const PerformPriceUpdate = (index: string, spuId: number, newPrice: string) =>
  ({
    CD: setProds.set(spuId, {
      priceCd: newPrice,
      priceGz: setProds.get(spuId)!.priceGz,
      priceBj: setProds.get(spuId)!.priceBj,
      priceCq: setProds.get(spuId)!.priceCq,
    }),
    CQ: setProds.set(spuId, {
      priceCd: setProds.get(spuId)!.priceCd,
      priceGz: setProds.get(spuId)!.priceGz,
      priceBj: setProds.get(spuId)!.priceBj,
      priceCq: newPrice,
    }),
    GZ: setProds.set(spuId, {
      priceCd: setProds.get(spuId)!.priceCd,
      priceGz: newPrice,
      priceBj: setProds.get(spuId)!.priceBj,
      priceCq: setProds.get(spuId)!.priceCq,
    }),
    BJ: setProds.set(spuId, {
      priceCd: setProds.get(spuId)!.priceCd,
      priceGz: setProds.get(spuId)!.priceGz,
      priceBj: newPrice,
      priceCq: setProds.get(spuId)!.priceCq,
    }),
  }[index]);

const productsMainProcess = async (
  products: ProductSAMS[],
  category: number,
  index: string
) => {
  const productsArray: CamelCasetoDB<ProductDB>[] = [];
  const ctpArray: CamelCasetoDB<CTPDB>[] = [];

  const result = await searchInCTP(category);
  const rows = result?.rows;
  const productsExist = new Map<number, boolean>();

  //遍历本分类历史数据,全部标记为下架
  if (rows && arrayIsnotEmty(rows)) {
    for (let i = 0; i < rows.length; i++) {
      productsExist.set(parseInt(rows[i].product), false);
    }
  }

  for (const product of products) {
    // 强制为数字
    const spuId = parseInt(product.spuId);
    // 价格
    const price = product.priceInfo[0].price;
    const exist = setProds.has(spuId) ? true : false;
    const online = productsExist.has(spuId) ? true : false;

    // 全局下存在商品,分类下存在商品且价格改变
    if (exist && online && PerformPriceCompare(index, spuId, price) !== 1) {
      const rate = PerformPriceCompare(index, spuId, price) as number;
      updateInProduct(price, rate, spuId, index);
      //记录历史价格
      insertInPrice(price, spuId, index);
      //更新全局商品价格
      PerformPriceUpdate(index, spuId, price);
      return;
    }
    // 全局存在,分类存在,价格未改
    if (exist && online) {
      productsExist.set(spuId, true);
      return;
    }
    // 全局存在,分类不存在,添加分类
    if (exist && !online) {
      insertInCTP(spuId, category);
      return;
    }
    //新品流程
    // init ProductDB
    const tmp: ProductDB = {
      spuId: spuId,
      title: product.title,
      priceCd: price,
      priceCq: price,
      priceGz: price,
      priceBj: price,
      imageUrl: product.image,
      available: 1,
      rateCd: 0,
      rateCq: 0,
      rateGz: 0,
      rateBj: 0,
    };

    //无重复数据进入写入数据库队列
    setProds.set(spuId, {
      priceBj: price,
      priceCd: price,
      priceCq: price,
      priceGz: price,
    });

    const relation: CTPDB = {
      category: category * 1,
      product: spuId,
    };

    productsArray.push(camelToDB(tmp));
    ctpArray.push(camelToDB(relation));
  }

  //写入数据库
  if (productsArray.length) {
    postAllToDB(
      productsArray,
      `INSERT INTO PRODUCT(SPU_ID, TITLE, IMAGE_URL, PRICE_CD, PRICE_CQ, PRICE_BJ, PRICE_GZ, RATE_CD, RATE_CQ, RATE_BJ, RATE_GZ, AVAILABLE) 
          VALUES (:SPU_ID, :TITLE, :IMAGE_URL, :PRICE_CD, :PRICE_CQ, :PRICE_BJ, :PRICE_GZ, :RATE_CD, :RATE_CQ, :RATE_BJ, :RATE_GZ, :AVAILABLE)`
    );
  }
  if (ctpArray.length) {
    postAllToDB(
      ctpArray,
      `INSERT INTO CTP(CATEGORY, PRODUCT) 
          VALUES (:CATEGORY, :PRODUCT)`
    );
  }

  //循环遍历下架判断
  productsExist.forEach((value, key) => {
    if (value === false) {
      updateOffLine(key);
    }
  });
};

export {getAllProducts, productsMainProcess};
