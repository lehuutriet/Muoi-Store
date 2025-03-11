import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Image,
  Dimensions,
  Alert,
  ViewStyle,
  ImageStyle,
  TextStyle,
} from "react-native";

import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Input,
  Icon,
  useTheme,
  Select,
  SelectItem,
  IndexPath,
  Modal,
  Card,
  Spinner,
} from "@ui-kitten/components";
import { WaitingModal } from "../components/common";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";

import { productIdsAtom, productAtomFamily, allCategoryAtom } from "../states";
import { useRecoilState, useRecoilCallback, atom } from "recoil";

import { useStorage, useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { useTranslation } from "react-i18next";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from "expo-image-picker";
type ImagePickerResult = ImagePicker.ImagePickerResult & {
  cancelled?: boolean;
};

const vndMask = createNumberMask({
  // prefix: ['đ'],
  delimiter: ",",
  separator: ",",
  precision: 3,
});
type RootStackParamList = {
  CreateProductScreen: {
    title: string;
    method: string;
    item?: {
      $id?: string;
      photo?: string;
      photoUrl?: string;
      name?: string;
      price?: number;
      cost?: number;
      description?: string;
      category?: string;
      stock?: number; // Thêm trường này
      minStock?: number; // Thêm trường này
    };
  };
};
type CreateProductScreenRouteProp = RouteProp<
  RootStackParamList,
  "CreateProductScreen"
>;
type CreateProductScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CreateProductScreen"
>;
const requiredText = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Text style={{ fontSize: 12 }} status="danger">
      {t("required")}
    </Text>
  );
};

const CreateProductScreen = ({
  route,
  navigation,
}: {
  route: CreateProductScreenRouteProp;
  navigation: CreateProductScreenNavigationProp;
}) => {
  const { uploadFile, getFileView } = useStorage();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const [required, setRequired] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [photo, setPhoto] = useState({
    uri: "file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540kennytat%252Fmuoi-store/ReactNative-snapshot-image8725451301359036851.png",
  });

  interface Category {
    $id: string;
    name: string;
  }
  interface Product {
    $id: string;
    name: string;
    photo: string;
    photoUrl: string;
    price: number;
    cost: number;
    category: string;
    stock: number; // Thêm trường này
    minStock: number; // Thêm trường này
    description: string;
  }
  const [categories] = useRecoilState<Category[]>(allCategoryAtom);
  const [photoID, setPhotoID] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string | null>(null);
  const [cost, setCost] = useState<string | null>(null);
  const [stock, setStock] = useState<string | null>(null);
  const [minStock, setMinStock] = useState<string | null>(null);
  const [selectedCategoryIndex, setSelectedCategoryIndex] =
    React.useState<IndexPath>(new IndexPath(0));
  const { set } = useRecoilCallback(
    ({ set }) =>
      () => ({ set }),
    []
  )();
  const getFileIdFromUrl = (url: string) => {
    const matches = url.match(/files\/([a-zA-Z0-9-]+)\/view/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  };
  useEffect(() => {
    console.log("CreateProductScreen called::", route.params);
    navigation.setOptions({ headerTitle: route.params.title });
    const item = route.params.item;

    if (item && item.$id) {
      // Tạo một hàm con async để xử lý việc tải ảnh
      const loadPhoto = async () => {
        try {
          // Thử tải ảnh từ photoUrl trước
          if (item.photoUrl) {
            console.log("Setting photo from photoUrl:", item.photoUrl);
            setPhoto({ uri: item.photoUrl });

            // Lấy fileID từ photoUrl
            const fileId = getFileIdFromUrl(item.photoUrl);
            if (fileId) {
              console.log("FileID extracted from URL:", fileId);
              setPhotoID(fileId);
            } else if (item.photo) {
              // Nếu không lấy được fileID từ url, dùng trường photo
              console.log("Using photo field as fallback:", item.photo);
              setPhotoID(item.photo);

              // Tải trực tiếp ảnh từ fileID
              const photoUrl = await getFileView(item.photo);
              if (photoUrl) {
                console.log("Setting photo from getFileView:", photoUrl);
                setPhoto({ uri: photoUrl });
              }
            }
          }
          // Nếu không có photoUrl nhưng có photo field
          else if (item.photo) {
            console.log("No photoUrl, using photo field:", item.photo);
            setPhotoID(item.photo);

            // Tải ảnh từ fileID
            const photoUrl = await getFileView(item.photo);
            if (photoUrl) {
              console.log("Setting photo from getFileView:", photoUrl);
              setPhoto({ uri: photoUrl });
            } else {
              console.log("Failed to get photo view from ID");
            }
          }
        } catch (error) {
          console.error("Error loading photo:", error);
        }
      };

      // Gọi hàm tải ảnh
      loadPhoto();

      // Thiết lập các trường khác
      if (item.name) {
        setName(item.name);
      }

      if (item.price) {
        setPrice(item.price.toString());
      }

      if (item.cost) {
        setCost(item.cost.toString());
      }

      if (item.description) {
        setDescription(item.description);
      }

      setStock((item.stock ?? 0).toString());
      setMinStock((item.minStock ?? 0).toString());

      if (item.category) {
        let index = categories.findIndex(
          (category) => category.$id === item.category
        );
        index = index >= 0 ? index + 1 : 0;
        setSelectedCategoryIndex(new IndexPath(index));
      }
    }
  }, []); // Bỏ photoID ra khỏi dependencies để tránh vòng lặp useEffect

  const handleTakePhotoFromCamera = async () => {
    // No permissions request is necessary for launching the image library
    let result: ImagePickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      selectionLimit: 1,
    });
    delete result.cancelled;
    console.log("photo::", JSON.stringify(result));
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleChoosePhotoFromLibrary = async () => {
    // No permissions request is necessary for launching the image library
    let result: ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      selectionLimit: 1,
    });
    delete result.cancelled;
    console.log("photo::", JSON.stringify(result));
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const showAlert = (tilte: string, message: string) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: "Ok",
          // onPress: () => Alert.alert('Cancel Pressed'),
          style: "cancel",
        },
      ],
      {
        cancelable: true,
        // onDismiss: () =>
        //   Alert.alert(
        //     'This alert was dismissed by tapping outside of the alert dialog.',
        //   ),
      }
    );

  // Refresh Product List
  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        try {
          const productData = await getAllItem(COLLECTION_IDS.products);
          const ids = [];
          for (const product of productData) {
            ids.push(product.$id);
            // Cập nhật từng product trong atom family
            set(productAtomFamily(product.$id), product);
          }
          set(productIdsAtom, ids);
        } catch (error) {
          console.error("Error refreshing product list:", error);
        }
      },
    []
  );
  useEffect(() => {
    // Refresh data khi component mount
    refreshProductList();
  }, []); // Chạy 1 lần khi component mount
  const onReset = async () => {
    setRequired(false);
    setPhotoID(null);
    setPhoto({ uri: "file:///default.jpeg" });
    setName("");
    setPrice(null);
    setCost(null);
    setDescription("");
    setSelectedCategoryIndex(new IndexPath(0));
  };

  const onDelete = async () => {
    if (route.params.item && route.params.item.$id) {
      try {
        await deleteItem(COLLECTION_IDS.products, route.params.item.$id);
        showAlert("", t("delete_product_success"));
      } catch (error) {
        showAlert("", t("delete_product_error"));
        console.log("deleteItem error::", error);
      } finally {
        refreshProductList();
        navigation.goBack();
      }
    }
  };

  const onCreate = async (method: string, navigateBack: boolean = true) => {
    try {
      setWaiting(true);

      // Trước tiên, upload ảnh nếu có ảnh mới
      let newPhotoID = photoID;

      if (
        !photo.uri.startsWith("http") &&
        photo.uri !== "file:///default.jpeg"
      ) {
        console.log("Uploading new photo...");
        try {
          const fileId = await uploadFile(photo, photoID);
          if (fileId && typeof fileId === "string") {
            newPhotoID = fileId;
            console.log("New photo ID:", newPhotoID);
          } else {
            console.log("Upload failed, keeping original photo ID if exists");
          }
        } catch (uploadError) {
          console.error("Error uploading photo:", uploadError);
          showAlert("", t("upload_photo_error"));
        }
      }

      // Tạo dữ liệu sản phẩm với photoID đã xác nhận
      // Khi tạo dữ liệu sản phẩm
      let data: any = {
        name: name.trim(),
        price: parseFloat((price ?? "0").replace(/\D/g, "")),
        cost: parseFloat((cost ?? "0").replace(/\D/g, "")),
        stock: parseInt((stock ?? "0").replace(/\D/g, "")),
        minStock: parseInt((minStock ?? "0").replace(/\D/g, "")),
        category:
          categories.length > 0 && selectedCategoryIndex.row > 0
            ? categories[selectedCategoryIndex.row - 1].$id
            : null,
        description: description.trim(),
        photo: newPhotoID ? newPhotoID.substring(0, 30) : "",
      };

      // Thêm trường photoUrl vào data trước khi lưu
      // Trong hàm onCreate
      if (newPhotoID) {
        const photoUrl = await getFileView(newPhotoID);
        if (photoUrl) {
          // Lưu chỉ fileID thay vì toàn bộ URL
          data.photoUrl = newPhotoID;
        }
      }

      if (newPhotoID && typeof newPhotoID === "string") {
        // Lưu toàn bộ ID
        data.photo = newPhotoID;
      } else {
        data.photo = "";
      }

      if (!data.name || !data.price || !data.category) {
        setRequired(true);
        setWaiting(false);
        showAlert("", t("please_fill_required_fields"));
        return;
      }

      // Thực hiện tạo hoặc cập nhật sản phẩm
      console.log("Submitting data:", data);
      let result;

      if (method === "create") {
        result = await createItem(COLLECTION_IDS.products, data);
      } else if (method === "update" && route.params.item?.$id) {
        result = await updateItem(
          COLLECTION_IDS.products,
          route.params.item.$id,
          data
        );
      } else {
        throw new Error("Invalid method or missing product ID");
      }

      if (result && result.$id) {
        console.log("Operation successful:", result);

        // Sau khi tạo/cập nhật sản phẩm thành công, thêm photoUrl vào
        if (newPhotoID) {
          try {
            const fileViewUrl = await getFileView(newPhotoID);
            if (fileViewUrl) {
              await updateItem(COLLECTION_IDS.products, result.$id, {
                photoUrl: fileViewUrl,
              });
            }
          } catch (error) {
            console.error("Error updating photoUrl:", error);
          }
        }

        await refreshProductList();

        showAlert(
          "",
          method === "create"
            ? t("create_product_success")
            : t("update_product_success")
        );

        onReset();

        if (navigateBack) {
          navigation.goBack();
        }
      } else {
        throw new Error("Operation failed - no result returned");
      }
    } catch (error) {
      console.error("Error in onCreate:", error);
      showAlert(
        "",
        method === "create"
          ? t("create_product_error")
          : t("update_product_error")
      );
    } finally {
      setWaiting(false);
    }
  };

  //
  return (
    <Layout level="1" style={{ height: Dimensions.get("window").height - 50 }}>
      {/* upload photo */}
      <Layout level="2" style={styles.photoLayout as ViewStyle}>
        <View>
          <Button
            style={[styles.button, { marginBottom: 5 }] as ViewStyle[]}
            status="primary"
            appearance="outline"
            size="small"
            accessoryLeft={() => (
              <Icon
                style={styles.icon}
                fill={theme["color-primary-500"]}
                name="image"
              />
            )}
            onPress={handleChoosePhotoFromLibrary}
          >
            {t("upload_photo")}
          </Button>

          <Button
            style={styles.button as ViewStyle}
            status="primary"
            appearance="outline"
            size="small"
            accessoryLeft={() => (
              <Icon
                style={styles.icon}
                fill={theme["color-primary-500"]}
                name="camera"
              />
            )}
            onPress={handleTakePhotoFromCamera}
          >
            {t("camera")}
          </Button>
        </View>
        <View style={{ paddingLeft: 10 }}>
          {photo && (
            <Image
              source={{ uri: photo.uri }}
              style={styles.photo as ImageStyle}
            />
          )}
        </View>
      </Layout>

      <Layout level="1" style={styles.productInfo as ViewStyle}>
        {/* product name */}
        <Input
          style={styles.input as TextStyle}
          value={name}
          label={t("product_name")}
          placeholder={t("product_example")}
          caption={() => (required && !name ? requiredText() : <></>)}
          onChangeText={(nextValue) => setName(nextValue)}
        />
        {/* product description */}
        <Input
          style={styles.input as any}
          value={description}
          label={t("product_description")}
          placeholder=""
          // caption={() => (required && !description ? requiredText() : <></>)}
          // accessoryRight={renderIcon}
          // secureTextEntry={secureTextEntry}
          onChangeText={(nextValue) => setDescription(nextValue)}
        />
        <Layout level="1" style={styles.price as ViewStyle}>
          {/* Hàng 1: price và cost */}
          <Input
            {...useMaskedInputProps({
              value: price || "",
              onChangeText: (masked, unmasked) => setPrice(unmasked),
              mask: vndMask,
            })}
            style={[
              styles.input as TextStyle,
              {
                paddingRight: 10,
                width: Dimensions.get("screen").width / 2 - 10,
              },
            ]}
            inputMode="numeric"
            label={t("price")}
            placeholder="0.000"
            caption={() => (required && !price ? requiredText() : <></>)}
          />
          <Input
            {...useMaskedInputProps({
              value: cost || "",
              onChangeText: (masked, unmasked) => setCost(unmasked),
              mask: vndMask,
            })}
            style={[
              styles.input as TextStyle,
              { width: Dimensions.get("screen").width / 2 - 10 },
            ]}
            inputMode="numeric"
            label={t("cost")}
            placeholder="0.000"
            onChangeText={(nextValue) => setCost(nextValue)}
          />
        </Layout>

        {/* Thêm một Layout mới cho stock và minStock */}
        <Layout level="1" style={styles.price as ViewStyle}>
          <Input
            {...useMaskedInputProps({
              value: stock || "",
              onChangeText: (masked, unmasked) => setStock(unmasked),
              mask: vndMask,
            })}
            style={[
              styles.input as TextStyle,
              {
                paddingRight: 10,
                width: Dimensions.get("screen").width / 2 - 10,
              },
            ]}
            inputMode="numeric"
            label={t("stock")}
            placeholder="0"
            caption={() => (required && !stock ? requiredText() : <></>)}
          />
          <Input
            {...useMaskedInputProps({
              value: minStock || "",
              onChangeText: (masked, unmasked) => setMinStock(unmasked),
              mask: vndMask,
            })}
            style={[
              styles.input as TextStyle,
              { width: Dimensions.get("screen").width / 2 - 10 },
            ]}
            inputMode="numeric"
            label={t("min_stock")}
            placeholder="0"
          />
        </Layout>
        {/* product categories */}
        <View>
          <Text style={{ color: theme["color-basic-600"], fontWeight: "bold" }}>
            {t("category")}
          </Text>
          <Select
            placeholder={t("no_category")}
            value={
              categories.length > 0
                ? selectedCategoryIndex.row > 0
                  ? categories[selectedCategoryIndex.row - 1].name
                  : t("choose_category")
                : ""
            }
            selectedIndex={selectedCategoryIndex}
            onSelect={(index: IndexPath | IndexPath[]) => {
              if (index instanceof IndexPath) {
                setSelectedCategoryIndex(index);
              }
            }}
            multiSelect={false} // Thêm dòng này để chỉ định rằng chỉ chọn một mục
          >
            {categories.length > 0 ? (
              [{ name: t("choose_category"), $id: "0" }]
                .concat(categories)
                .map((category) => (
                  <SelectItem title={category.name} key={category.$id} />
                ))
            ) : (
              <></>
            )}
          </Select>
        </View>
      </Layout>
      {/* function button */}
      {route.params.method === "create" ? (
        <Layout level="1" style={styles.buttons as ViewStyle}>
          <Button
            style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
            appearance="outline"
            status="primary"
            onPress={() => onCreate("create", false)}
          >
            {t("create_more")}
          </Button>
          <Button
            style={{ flex: 1, marginLeft: 5 }}
            onPress={() => onCreate("create")}
          >
            {t("done")}
          </Button>
        </Layout>
      ) : (
        <Layout level="1" style={styles.buttons as ViewStyle}>
          <Button
            style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
            appearance="outline"
            status="danger"
            onPress={() => onDelete()}
          >
            {t("delete")}
          </Button>
          <Button
            style={{ flex: 1, marginLeft: 5 }}
            onPress={() => onCreate("update")}
          >
            {t("update")}
          </Button>
        </Layout>
      )}
      <WaitingModal waiting={waiting} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  photoLayout: {
    justifyContent: "flex-start",
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    padding: 10,
    // paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "white",
  },
  detail: {
    flexDirection: "row",
    display: "flex",
    width: Dimensions.get("window").width - 100,
  },
  productInfo: {
    width: "100%",
    flex: 1,
    // height: Dimensions.get("window").height,
    padding: 10,
  },
  price: {
    flexDirection: "row",
    display: "flex",
    width: "100%",
    // width: 50,
    // backgroundColor: "red",
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 5,
  } as ImageStyle,
  icon: {
    width: 20,
    height: 20,
  },
  input: {
    paddingBottom: 10,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "white",
    borderRadius: 0,
  },

  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 30,
    padding: 10,
  },
});

export default CreateProductScreen;
