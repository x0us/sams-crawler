import OracleDB from '../oracledb';
import {OUT_FORMAT_OBJECT} from 'oracledb';
import {
  CategorySAMS,
  CategoryDB,
  CamelCasetoDB,
  camelToDB,
  arrayIsnotEmty,
} from '../share';

const menusExist = new Map<number, number>();

/**
 * Fetch all categories
 */
const getAllCategories = async () => {
  const result = await OracleDB.execute(
    'SELECT GROUPING_ID AS "groupingId", QUANTITY AS "quantity" FROM CATEGORY',
    {},
    {
      outFormat: OUT_FORMAT_OBJECT,
    }
  );
  const rows = result?.rows;
  if (rows && arrayIsnotEmty(rows)) {
    for (let i = 0; i < rows.length; i++) {
      menusExist.set(rows[i].groupingId, rows[i].quantity);
    }
  }
};

/**
 * Fetch all categories from Sams website and compare with db
 */
const categoriesMainProcess = (
  categories: CategorySAMS[],
  parent: number,
  quantity: number
) => {
  const menusNotExist: CamelCasetoDB<CategoryDB>[] = [];

  categories.forEach(category => {
    //判断数据是否重复
    const sizeOriginal = menusExist.size;
    const id = parseInt(category.groupingId);
    //判断id是否存在
    if ((menusExist.get(id) as number) < quantity) {
      //更新相应数量
      updateQuantity(id, quantity);
      return;
    }

    if (menusExist.has(id)) {
      return;
    }

    //init cat
    menusExist.set(id, quantity);
    const cat: CategoryDB = {
      groupingId: id,
      layer: category.level,
      parent: parent,
      title: category.title,
      quantity: quantity,
      imageUrl: undefined,
    };

    //写入数据库
    if (category['image']) {
      cat.imageUrl = category.image;
    }

    menusNotExist.push(camelToDB(cat));
  });

  if (menusNotExist.length) {
    postAllCategories(menusNotExist);
  }
};

/**
 * post category into db
 */

const postAllCategories = (data: CamelCasetoDB<CategoryDB>[]) => {
  const sql = `INSERT INTO CATEGORY(TITLE, PARENT, LAYER, GROUPING_ID, IMAGE_URL, QUANTITY) 
VALUES (:TITLE, :PARENT, :LAYER, :GROUPING_ID, :IMAGE_URL, :QUANTITY)`;
  OracleDB.executeManyWithOptions(sql, data);
};

const updateQuantity = async (id: number, quantity: number) => {
  const sql = 'UPDATE CATEGORY SET QUANTITY =:quantity where GROUPING_ID =:id';
  OracleDB.execute(sql, {quantity: quantity, id: id});
};

export {getAllCategories, categoriesMainProcess};
