import React, { useContext, useEffect, useRef } from "react";
import uuid from "react-native-uuid";
import {
  Client,
  Databases,
  Account,
  Graphql,
  Storage,
  Functions,
  ID,
  Teams,
  AppwriteException,
} from "react-native-appwrite";

import { AppwriteContext } from "../contexts/AppContext";
import {
  allProductsAtom,
  allCategoryAtom,
  allOrdersAtom,
  allTablesAtom,
  productIdsAtom,
  productAtomFamily,
  categoryIdsAtom,
  categoryAtomFamily,
  tableIdsAtom,
  tableAtomFamily,
  orderIdsAtom,
  orderAtomFamily,
  allWarehouseItemsAtom,
  warehouseIdsAtom,
  warehouseItemAtomFamily,
} from "../states";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "appwrite";
const client = new Client();
client
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("66a085e60016a161b67b")
  .setPlatform("com.test.app");

// Setting appwrite connection info here
let APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
let PROJECT_ID = "66a085e60016a161b67b";
const DEFAULT_USER_PREFS = {
  DATABASE_ID: "muoi-store",
  BUCKET_ID: "muoi-store-storage",
  STORE_NAME: "AYAI-Coffee",
  PUSH_TOKEN: "",
  NAME: "",
  PHONE: "",
  ADDRESS: "",
  returns: "returns",
};

export const COLLECTION_IDS = {
  products: "products",
  categories: "categories",
  orders: "orders",
  tables: "tables",
  returns: "returns",
  warehouse: "warehouse",
  recipes: "recipes",
  customers: "customers",
  promotions: "promotions",
  coupons: "coupons",
  suppliers: "suppliers",
  supplierTransactions: "supplierTransactions",
  events: "events",
  // store: 'store'
};
interface GraphQLResponse {
  errors?: Array<{ message: string }>;
  [key: string]: any;
}
export const DATA_ATOM = {
  products: {
    all: allProductsAtom,
    ids: productIdsAtom,
    idData: productAtomFamily,
  },
  categories: {
    all: allCategoryAtom,
    ids: categoryIdsAtom,
    idData: categoryAtomFamily,
  },
  orders: {
    all: allOrdersAtom,
    ids: orderIdsAtom,
    idData: orderAtomFamily,
  },
  tables: {
    all: allTablesAtom,
    ids: tableIdsAtom,
    idData: tableAtomFamily,
  },
  warehouse: {
    all: allWarehouseItemsAtom,
    ids: warehouseIdsAtom,
    idData: warehouseItemAtomFamily,
  },
};
export function createAppwriteClient(endpoint: string, id: string) {
  try {
    const storage = new Storage(client);
    const graphql = new Graphql(client);
    const account = new Account(client);
    const databases = new Databases(client);
    const teams = new Teams(client);

    return {
      client,
      graphql,
      account,
      databases,
      teams,
      storage,
    };
  } catch (error) {
    console.error("Lỗi khởi tạo Appwrite client:", error);
    return null;
  }
}
export function useAccounts() {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error("AppwriteContext must be used within AppwriteProvider");
  }
  const { account, graphql, teams } = context;

  const getUserPrefs = async () => {
    try {
      // Cố gắng lấy từ server trước
      const prefs = await account.getPrefs();
      if (prefs && Object.keys(prefs).length > 0) {
        // Nếu thành công, cập nhật AsyncStorage
        await AsyncStorage.setItem("userPrefs", JSON.stringify(prefs));
        return prefs;
      }

      // Nếu không lấy được từ server, thử lấy từ AsyncStorage
      const storedPrefs = await AsyncStorage.getItem("userPrefs");
      if (storedPrefs) {
        return JSON.parse(storedPrefs);
      }

      return DEFAULT_USER_PREFS;
    } catch (error) {
      console.error("Error getting user prefs:", error);

      // Fallback đến AsyncStorage
      const storedPrefs = await AsyncStorage.getItem("userPrefs");
      return storedPrefs ? JSON.parse(storedPrefs) : DEFAULT_USER_PREFS;
    }
  };

  const updateUserPrefs = async (prefs = {}) => {
    return account
      .updatePrefs(prefs)
      .then(
        function (response) {
          return true;
        },
        function (error) {
          return false;
        }
      )
      .catch((error) => {
        console.log(error);
      });
  };

  const updatePassword = async (oldPass: string, newPass: string) => {
    return account.updatePassword(newPass, oldPass).then(
      function (response) {
        console.log("updatePassword success::", response); // Success
        return response;
      },
      function (error: AppwriteException) {
        console.log("updatePassword err:", error.message); // Failure
        return {
          status: false,
          message: error.message,
        };
      }
    );
  };

  const updateEmail = async (email: string, password: string) => {
    return account.updateEmail(email, password).then(
      function (response) {
        console.log("updatePassword success::", response); // Success
        return true;
      },
      function (error) {
        console.log("updatePassword err:", error); // Failure
        return false;
      }
    );
  };

  const joinTeam = async (
    teamId: string,
    email: string,
    role: string[],
    redirectUrl: string
  ) => {
    // Bỏ biến roleArray, sử dụng trực tiếp role
    return teams
      .createMembership(teamId, email as any, role as any, redirectUrl)
      .then(
        function (response) {
          console.log("joinTeam success::", response);
          return true;
        },
        function (error) {
          console.log("joinTeam err:", error);
          return false;
        }
      );
  };
  const getSession = async () => {
    try {
      // const sessionId = await AsyncStorage.getItem("currentSessionID");
      // if (!sessionId) return false;

      try {
        const response = await account.getSession("current");

        return response;
      } catch (err) {
        // await AsyncStorage.removeItem("currentSessionID");
        return false;
      }
    } catch (error) {
      return "error";
    }
  };

  const createUser = async (
    email: string,
    password: string,
    name: string = ""
  ) => {
    // log in with appwrite
    console.log("createUser called::", email, password, name);
    return account
      .create(ID.unique(), email, password, name)
      .then(async (response) => {
        console.log("create user res::", response);
        updateUserPrefs(DEFAULT_USER_PREFS);
        joinTeam("muoi-user-team", email, [], "muoi-store://");
        return true;
      })
      .catch((err: AppwriteException) => {
        return false;
      });
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("login start1::", account);

      const response = await account.createEmailPasswordSession(
        email,
        password
      );
      console.log("login start2::", account);
      await Promise.all([
        AsyncStorage.setItem("currentSessionID", response.$id),
        AsyncStorage.setItem("userEmail", email),
      ]);
      console.log("login start3::", account);
      return response;
    } catch (err: any) {
      return err.code === 0 ? "error" : false;
    }
  };
  const logout = async () => {
    console.log("logout called::");
    let userPrefs = await getUserPrefs();
    userPrefs.PUSH_TOKEN = "";
    updateUserPrefs(userPrefs);
    AsyncStorage.removeItem("currentSessionID");
    AsyncStorage.removeItem("userEmail");
    AsyncStorage.removeItem("userPrefs");

    try {
      // Sửa cách sử dụng mutation
      const response = (await graphql.mutation({
        query: `mutation {
                  accountDeleteSession(
                      sessionId: "current"
                  ) {
                      status
                  }
              }`,
      })) as GraphQLResponse;

      // Sửa kiểm tra errors
      if (response && response.errors && response.errors.length > 0) {
        throw response.errors[0].message;
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  return {
    getSession,
    getUserPrefs,
    updateUserPrefs,
    updatePassword,
    updateEmail,
    createUser,
    login,
    logout,
  };
}

export function useDatabases() {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error("AppwriteContext must be used within AppwriteProvider");
  }
  const { databases, account } = context;
  const { getUserPrefs } = useAccounts();
  const { getFileView } = useStorage();
  async function getCurrentUserId() {
    try {
      // Lấy thông tin user thay vì session
      const user = await account.get();

      return user.$id; // ID của user
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  }
  // Products Databases Function
  async function getAllItem(collectionId: any, queries: string[] = []) {
    const userPrefs = await getUserPrefs();
    const userId = await getCurrentUserId();

    let finalQueries = [...queries];
    // Thay đổi ở đây để thêm các collection ngoại lệ
    if (
      collectionId !== COLLECTION_IDS.products &&
      collectionId !== COLLECTION_IDS.categories &&
      collectionId !== COLLECTION_IDS.coupons &&
      collectionId !== COLLECTION_IDS.promotions &&
      userId
    ) {
      finalQueries.push(Query.equal("userId", userId));
    }

    const items = await databases.listDocuments(
      userPrefs.DATABASE_ID,
      collectionId,
      finalQueries
    );

    if (collectionId === COLLECTION_IDS.products) {
      return await Promise.all(
        items.documents.map(async (item: any) => ({
          ...item,
          photoUrl: await getFileView(item.photo),
          count: 0,
        }))
      );
    } else {
      return items.documents;
    }
  }
  async function getSingleItem(collectionId: any, documentId: any) {
    const userPrefs = await getUserPrefs();
    return databases
      .getDocument(userPrefs.DATABASE_ID, collectionId, documentId)
      .then(
        function (response: any) {
          return response;
        },
        function (error: any) {
          return false;
        }
      );
  }
  async function createItem(collectionId: string, data: any) {
    const userPrefs = await getUserPrefs();
    if (!userPrefs.DATABASE_ID) {
      throw new Error("Database ID not found in user preferences");
    }

    // Lấy userId từ phiên đăng nhập hiện tại
    const session = await account.getSession("current");
    console.log("Session when creating:", JSON.stringify(session, null, 2));

    const userId = session.userId;
    console.log("User ID for creating:", userId);

    // Thêm userId cho mọi collection trừ products
    let finalData = { ...data };
    if (collectionId !== COLLECTION_IDS.products && userId) {
      finalData.userId = userId;
    }

    console.log("Final data to save:", finalData);

    return databases.createDocument(
      userPrefs.DATABASE_ID,
      collectionId,
      ID.unique(),
      finalData
    );
  }
  async function updateItem(collectionId: any, itemID: any, data: any) {
    const userPrefs = await getUserPrefs();
    const item = await databases.updateDocument(
      userPrefs.DATABASE_ID,
      collectionId,
      itemID,
      data
    );
    console.log("updateItem called::", item, data);
    return item;
  }

  async function addStockTransaction(
    productId: string,
    quantity: number,
    type: "in" | "out",
    notes: string = ""
  ) {
    const userPrefs = await getUserPrefs();

    const transactionData = {
      productId,
      quantity,
      type,
      notes,
      transactionDate: new Date().toISOString(),
    };

    return databases.createDocument(
      userPrefs.DATABASE_ID,
      COLLECTION_IDS.warehouse,
      ID.unique(),
      transactionData
    );
  }

  async function getProductStock(productId: string) {
    const userPrefs = await getUserPrefs();

    // Lấy tất cả giao dịch của sản phẩm
    const transactions = await databases.listDocuments(
      userPrefs.DATABASE_ID,
      COLLECTION_IDS.warehouse,
      [Query.equal("productId", productId)]
    );

    // Tính toán số lượng tồn kho
    let stock = 0;
    transactions.documents.forEach((item: any) => {
      if (item.type === "in") {
        stock += item.quantity;
      } else if (item.type === "out") {
        stock -= item.quantity;
      }
    });

    return stock;
  }
  async function deleteItem(collectionId: any, itemID: any) {
    const userPrefs = await getUserPrefs();
    const item = await databases.deleteDocument(
      userPrefs.DATABASE_ID,
      collectionId,
      itemID
    );
    console.log("deleteItem called::", item);
    return item;
  }

  return {
    getAllItem,
    getSingleItem,
    createItem,
    updateItem,
    deleteItem,
    addStockTransaction,
    getProductStock,
  };
}

export function useStorage() {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error("AppwriteContext must be used within AppwriteProvider");
  }
  const { storage } = context;
  const { getUserPrefs } = useAccounts();
  // Function to upload file to server
  async function uploadFile(
    file: any,
    oldPhotoID: any
  ): Promise<string | false> {
    const userPrefs = await getUserPrefs();
    return new Promise(async (resolve, reject) => {
      try {
        console.log("upload file called::", file.uri);
        const fileID = uuid.v4();
        let match = /\.(\w+)$/.exec(file.uri);
        let type = match ? `image/${match[1]}` : `image`;
        let formData: any = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.uri.split("/").pop(),
          type,
        });
        formData.append("bucketId", userPrefs.BUCKET_ID);
        formData.append("fileId", fileID);

        const apiEndPoint = `${APPWRITE_ENDPOINT}/storage/buckets/${userPrefs.BUCKET_ID}/files`;
        const appwriteHeaders = {
          "X-Appwrite-Project": PROJECT_ID,
          "X-Appwrite-Response-Format": "11.0.0",
        };

        const result = await fetch(apiEndPoint, {
          method: "POST",
          headers: appwriteHeaders,
          body: formData,
          credentials: "include",
        });

        if (result && result.status === 201) {
          const responseData = await result.json();
          if (oldPhotoID) {
            fetch(`${apiEndPoint}/${oldPhotoID}`, {
              method: "DELETE",
              headers: appwriteHeaders,
              credentials: "include",
            });
          }

          if (responseData && responseData.$id) {
            resolve(responseData.$id);
          } else {
            console.log("Invalid response data:", responseData);
            resolve(false);
          }
        } else {
          console.log("Upload failed, status:", result.status);
          resolve(false);
        }
      } catch (error) {
        console.log("upload error::", error);
        resolve(false);
      }
    });
  }
  async function getFileView(fileID: string): Promise<string | null> {
    if (!fileID) return null;

    try {
      const userPrefs = await getUserPrefs();

      let fullFileID = fileID;
      if (fileID.length < 36 && fileID.includes("-")) {
        try {
          // Nếu có thể, liệt kê tất cả files trong bucket và tìm cái khớp
          const files = await storage.listFiles(userPrefs.BUCKET_ID);
          const matchingFile = files.files.find((file: any) =>
            file.$id.startsWith(fileID)
          );
          if (matchingFile) {
            fullFileID = matchingFile.$id;
          }
        } catch (e) {
          console.log("Could not search for full file ID:", e);
        }
      }

      const directUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${userPrefs.BUCKET_ID}/files/${fullFileID}/view?project=${PROJECT_ID}`;

      return directUrl;
    } catch (error) {
      console.error("Error getting file view:", error);
      return null;
    }
  }
  return { uploadFile, getFileView };
}
