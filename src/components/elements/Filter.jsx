export async function getProductTypes() {
  const query = `{
    shop {
      products(first:250, query:"-product_type:''") {
        edges {
            node {
              size
          }
        }
      }
    }
  }`;

  const response = await ShopifyData(query);
  const rawProductTypes = response.data.shop.products
    ? response.data.shop.products.edges
    : [];
  const productTypes = Array.from(new Set(rawProductTypes));
  console.log('tut:', productTypes);
  return productTypes;
}

export async function filter(type) {
  let filtredProducts = await getProductsInCollection();
  return filtredProducts.filter((product) => product.node.productType === type);
}

