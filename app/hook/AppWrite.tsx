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
} from "../states";
import AsyncStorage from "@react-native-async-storage/async-storage";

const client = new Client();
client
  .setEndpoint("https://store.hjm.bid/v1")
  .setProject("67b3e08f00152bbd6ed4")
  .setPlatform("com.muoistore.app");

// Setting appwrite connection info here
let APPWRITE_ENDPOINT = "https://store.hjm.bid/v1";
let PROJECT_ID = "67b3e08f00152bbd6ed4";
const DEFAULT_USER_PREFS = {
  DATABASE_ID: "muoi-store",
  BUCKET_ID: "muoi-store-storage",
  STORE_NAME: "Muối Store",
  PUSH_TOKEN: "",
  NAME: "",
  PHONE: "",
  ADDRESS: "",
};

export const COLLECTION_IDS = {
  products: "products",
  categories: "categories",
  orders: "orders",
  tables: "tables",
  // warehouse: "warehouse",
  // store: 'store'
};
interface GraphQLResponse {
  errors?: Array<{ message: string }>;
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
  // warehouse: "warehouse",
  // store: 'store'
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
    const storedUserPrefs = await AsyncStorage.getItem("userPrefs");
    if (storedUserPrefs) {
      return JSON.parse(storedUserPrefs);
    } else {
      const prefs = await account.getPrefs();
      const userPrefs = prefs && prefs.DATABASE_ID ? prefs : DEFAULT_USER_PREFS;
      await AsyncStorage.setItem("userPrefs", JSON.stringify([userPrefs])); // Bọc trong mảng
      return userPrefs;
    }
  };

  const updateUserPrefs = async (prefs = {}) => {
    console.log("updateUserPrefs called::", prefs);

    return account
      .updatePrefs(prefs)
      .then(
        function (response) {
          console.log("updateUserPrefs success::", response); // Success
          return true;
        },
        function (error) {
          console.log("updateUserPrefs err:", error); // Failure
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
    return teams.createMembership(teamId, email, role, redirectUrl).then(
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
        console.log("get-sessionId start::");
        const response = await account.getSession("current");
        console.log("get-sessionId end::");
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
      const response = await graphql.mutation<GraphQLResponse>({
        query: `mutation {
                accountDeleteSession(
                    sessionId: "current"
                ) {
                    status
                }
            }`,
      });

      if (response && response.errors) {
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
  const { databases } = context;
  const { getUserPrefs } = useAccounts();
  const { getFileView } = useStorage();

  // Products Databases Function
  async function getAllItem(collectionId: any, queries: string[] = []) {
    const userPrefs = await getUserPrefs();
    const items = await databases.listDocuments(
      userPrefs.DATABASE_ID,
      collectionId,
      queries
    );
    // console.log("getAllItem called::", items.documents);
    if (collectionId === COLLECTION_IDS.products) {
      return await Promise.all(
        items.documents.map(async (item: any) => ({
          ...item,
          photoUrl: await getFileView(item.photo),
          count: 0,
        }))
      );
      // return items.documents;
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
          console.log("getDocument success::", response); // Success
          return response;
        },
        function (error: any) {
          console.log("getDocument err:", error); // Failure
          return false;
        }
      );
  }
  async function createItem(collectionId: any, data: any) {
    const userPrefs = await getUserPrefs();
    const item = await databases.createDocument(
      userPrefs.DATABASE_ID,
      collectionId,
      ID.unique(),
      data
    );
    console.log(`create ${collectionId} called::`, item, data);
    return item;
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

  return { getAllItem, getSingleItem, createItem, updateItem, deleteItem };
}

export function useStorage() {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error("AppwriteContext must be used within AppwriteProvider");
  }
  const { storage } = context;
  const { getUserPrefs } = useAccounts();
  // Function to upload file to server
  async function uploadFile(file: any, oldPhotoID: any) {
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
        // console.log("formData::", formData);
        const apiEndPoint = `${APPWRITE_ENDPOINT}/storage/buckets/${userPrefs.BUCKET_ID}/files`;
        const appwriteHeaders = {
          "X-Appwrite-Project": PROJECT_ID,
          // "content-type": "multipart/form-data",
          "X-Appwrite-Response-Format": "11.0.0",
          // "x-sdk-version": "appwrite:web:11.0.0",
        };
        const result = await fetch(apiEndPoint, {
          method: "POST",
          headers: appwriteHeaders,
          body: formData,
          credentials: "include",
        });
        console.log("upload result::", JSON.stringify(result));
        if (result && result.status === 201) {
          if (oldPhotoID) {
            fetch(`${apiEndPoint}/${oldPhotoID}`, {
              method: "DELETE",
              headers: appwriteHeaders,
              credentials: "include",
            });
          }
          resolve(fileID);
        } else {
          resolve(false);
        }
      } catch (error) {
        console.log("upload error::", error);
        resolve(false);
      }
    });
  }
  async function getFileView(fileID: string): Promise<string | null> {
    const userPrefs = await getUserPrefs();
    const result = await storage.getFileView(userPrefs.BUCKET_ID, fileID);
    return fileID && result && result._url
      ? `${result._url}?project=${PROJECT_ID}`
      : null;
  }
  return { uploadFile, getFileView };
}
