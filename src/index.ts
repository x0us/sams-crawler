import 'reflect-metadata';
import axios from 'axios';
import OracleDB from './oracledb';
import {
  baseCategroyUrl,
  baseArray,
  baseArrayIndex,
  subCategroyUrl,
  productUrl,
} from './share';
import {
  getAllCategories,
  categoriesMainProcess,
} from './category/category.controller';
import {
  getAllProducts,
  productsMainProcess,
} from './product/product.controller';

require('dotenv').config();

const headers = {
  'Content-Type': ' application/json',
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('program start at: ' + new Date());
  //init instance
  await OracleDB.instance();
  await getAllCategories();
  await getAllProducts();

  for (let i = 0; i < baseArray.length; i++) {
    console.log(`start ${baseArrayIndex[i]} site crawler`);
    //step1 get all category, no asynchronous due to the free oracle services limitation(must less than 20 sessions)
    const {data} = await axios.post(baseCategroyUrl, baseArray[i], {
      headers: headers,
    });
    if (data) {
      categoriesMainProcess(data.data, 0, 0);
      for (const menu of data.data) {
        const {data} = await axios.post(
          subCategroyUrl,
          {groupingId: menu.groupingId, navigationId: '1'},
          {headers: headers}
        );
        if (data) {
          //level2 to db
          categoriesMainProcess(data.data, menu.groupingId, 0);
          for (const value of data.data) {
            if (value.children.length) {
              //level3 to db
              for (const fin of value.children) {
                const productPost = `{"useNew":1,"storeInfoVOList":${JSON.stringify(
                  baseArray[i].storeCategoryList
                )},"pageSize":1000,"groupingId":"${
                  fin.groupingId
                }","pageNum":1}`;
                try {
                  const products = await axios.post(productUrl, productPost, {
                    headers: headers,
                  });
                  if (products.data.data.dataList) {
                    const x = products.data.data.dataList.length;
                    productsMainProcess(
                      products.data.data.dataList,
                      fin.groupingId,
                      baseArrayIndex[i]
                    );
                    categoriesMainProcess(value.children, value.groupingId, x);
                  }
                } catch (err) {
                  console.log(
                    `groupdid : ${fin.groupingId} encount network issue`
                  );
                  console.error(err);
                }
              }
            }
          }
        }
      }
    }
  }

  console.log('program finished at: ' + new Date());
  console.log('waiting next day')
  await sleep(86400000)
  console.log('waiting finished')
}

main();

//be benifit 

