import { Suspense } from 'react';
import {
  gql,
  Seo,
  ShopifyAnalyticsConstants,
  useServerAnalytics,
  useLocalization,
  useShopQuery,
} from '@shopify/hydrogen';

import { PRODUCT_CARD_FRAGMENT } from '~/lib/fragments';
import {
  PageHeader,
  ProductGrid,
  Section,
  Text,
  CollectionFilter,
} from '~/components';
import { NotFound, Layout } from '~/components/index.server';

const pageBy = 80;
var sortKey = 'MANUAL';
var sortReverse = false;
var filterMinPrice = 200;
var filterMaxPrice = 4000;
var filterPrice = false;

export default function Collection({ params, request }) {
  const { handle } = params;
  const url = new URL(request.url);
  sortKey = url.searchParams.get('sortkey');
  sortReverse = url.searchParams.get('reverse') === 'true' ? true : false;
  var filterAvailability =
    url.searchParams.get('availability') === 'true'
      ? true
      : url.searchParams.get('availability') === 'false'
      ? false
      : 'both';
  filterPrice = url.searchParams.get('price') === 'true' ? true : false;
  if (filterPrice) {
    filterMinPrice = parseFloat(url.searchParams.get('min'));
    filterMaxPrice = parseFloat(url.searchParams.get('max'));
  }

  const {
    language: { isoCode: language },
    country: { isoCode: country },
  } = useLocalization();
  const {
    data: { collection },
  } =
    filterPrice == true
      ? useShopQuery({
          query: COLLECTION_FILTER_PRICE_QUERY,
          variables: {
            handle,
            language,
            country,
            pageBy,
            sortKey,
            sortReverse,
            filterMinPrice,
            filterMaxPrice,
          },
          preload: true,
        })
      : filterAvailability == true
      ? useShopQuery({
          query: COLLECTION_FILTER_AVAILABILITY_QUERY,
          variables: {
            handle,
            language,
            country,
            pageBy,
            sortKey,
            sortReverse,
            filterAvailability,
          },
          preload: true,
        })
      : filterAvailability == false
      ? useShopQuery({
          query: COLLECTION_FILTER_AVAILABILITY_QUERY,
          variables: {
            handle,
            language,
            country,
            pageBy,
            sortKey,
            sortReverse,
            filterAvailability,
          },
          preload: true,
        })
      : filterAvailability === 'both'
      ? useShopQuery({
          query: COLLECTION_QUERY,
          variables: {
            handle,
            language,
            country,
            pageBy,
            sortKey,
            sortReverse,
          },
          preload: true,
        })
      : useShopQuery({
          query: COLLECTION_QUERY,
          variables: {
            handle,
            language,
            country,
            pageBy,
            sortKey,
            sortReverse,
          },
          preload: true,
        });

  let mem = useShopQuery({
    query: COLLECTION_QUERY_FULL,
    variables: {
      handle,
      language,
      country,
      pageBy,
      sortKey,
      sortReverse,
    },
    preload: true,
  }).data.collection.products;
  console.log('data:', mem);

  // let arr = [];
  // Object.keys(mem).forEach(function (a) {
  //   arr.push(mem[a][0]);
  // });
  // console.log(arr.length);
  // let arr2 = [];
  // Object.values(arr).forEach(function (a) {
  //   arr2.push(arr[a]);
  // });
  // console.log('arr:', arr2);
  /////////////////////////////////////
  let array = mem.nodes;
  // array = array.map((item) => item.options);
  // console.log('opt: ', array);
  // let free = [];
  // for (let i = 0; i < array.length; i++) {
  //   for (let j = 0; j < array[i].length; j++) {
  //     let name = array[i][j].name;
  //     let values = array[i][j].values;
  //     //free.push(array[i][0].name);
  //     free.push({ name: name, values: [...values] });
  //     console.log('obg', name, values);
  //   }
  // }
  // console.log('umnik:', array, free);
  let sigma;
  let filterObj = { size: [] };
  let colorObj = { color: [] };
  let options = [];
  let sizes = new Set();
  let colors = new Set();
  sigma = Object.values(mem);
  sigma[0].map((el) => {
    options.push(Object.entries(el)[5][1]);
    options.map((el) => {
      el.map((el1) => {
        el1.name === 'Size'
          ? el1.values.map((size) => sizes.add(size))
          : el1.name === 'Color'
          ? el1.values.map((color) => colors.add(color))
          : '';
      });
    });
  });
  colorObj.color = Array.from(colors);
  filterObj.size = Array.from(sizes);
  Object.assign(filterObj, colorObj);
  console.log(filterObj);
  if (!collection) {
    return <NotFound type="collection" />;
  }

  useServerAnalytics({
    shopify: {
      canonicalPath: `/collections/${handle}`,
      pageType: ShopifyAnalyticsConstants.pageType.collection,
      resourceId: collection.id,
      collectionHandle: handle,
    },
  });

  return (
    <Layout>
      <Suspense>
        <Seo type="collection" data={collection} />
      </Suspense>
      <PageHeader heading={collection.title}>
        {collection?.description && (
          <div className="flex items-baseline justify-between w-full">
            <div>
              <Text format width="narrow" as="p" className="inline-block">
                {collection.description}
              </Text>
            </div>
          </div>
        )}
      </PageHeader>
      <CollectionFilter
        filterObj={filterObj}
        minPrice={filterMinPrice}
        maxPrice={filterMaxPrice}
      />
      <Section>
        <ProductGrid
          key={collection.id}
          collection={collection}
          url={`/collections/${handle}?country=${country}`}
        />
      </Section>
    </Layout>
  );
}

// API endpoint that returns paginated products for this collection
// @see templates/demo-store/src/components/product/ProductGrid.client.tsx
export async function api(request, { params, queryShop }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }
  const url = new URL(request.url);

  const cursor = url.searchParams.get('cursor');
  const country = url.searchParams.get('country');
  const { handle } = params;

  return await queryShop({
    query: PAGINATE_COLLECTION_QUERY,
    variables: {
      handle,
      cursor,
      pageBy,
      country,
    },
  });
}

const COLLECTION_QUERY_FULL = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $sortKey:  ProductCollectionSortKeys
    $sortReverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, after: $cursor, sortKey: $sortKey, reverse: $sortReverse) {
        nodes {
          ...ProductCard
            options {
            name
            values
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const COLLECTION_QUERY = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $sortKey:  ProductCollectionSortKeys
    $sortReverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, after: $cursor, sortKey: $sortKey, reverse: $sortReverse
        filters: { variantOption: { name: "Color", value: "Syntax" } }) {
        nodes {
          ...ProductCard
            options {
            name
            values
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
const COLLECTION_QUERY_saved_for_filter_to_work = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $sortKey:  ProductCollectionSortKeys
    $sortReverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, after: $cursor, sortKey: $sortKey, reverse: $sortReverse
        filters: { variantOption: { name: "Color", value: "Syntax" } }) {
        nodes {
          ...ProductCard
            options {
            name
            values
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const COLLECTION_FILTER_AVAILABILITY_QUERY = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $sortKey:  ProductCollectionSortKeys
    $sortReverse: Boolean
    $filterAvailability: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, filters: { available: $filterAvailability}, after: $cursor, sortKey: $sortKey, reverse: $sortReverse) {
        nodes {
          ...ProductCard
          options {
            name
            values
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const COLLECTION_FILTER_PRICE_QUERY = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $sortKey:  ProductCollectionSortKeys
    $sortReverse: Boolean
    $filterMinPrice: Float
    $filterMaxPrice: Float
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, filters: { price: { min: $filterMinPrice, max: $filterMaxPrice } }, after: $cursor, sortKey: $sortKey, reverse: $sortReverse) {
        nodes {
          ...ProductCard
          options {
            name
            values
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const PAGINATE_COLLECTION_QUERY = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionPage(
    $handle: String!
    $pageBy: Int!
    $cursor: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: $pageBy, after: $cursor) {
        nodes {
          ...ProductCard
          options {
            name
            values
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
