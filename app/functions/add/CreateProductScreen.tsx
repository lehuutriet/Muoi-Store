import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Image,
  Dimensions,
  Alert,
  ViewStyle,
  ImageStyle,
  TextStyle,
  ScrollView,
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
import { WaitingModal } from "../../components/common";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";

import {
  productIdsAtom,
  productAtomFamily,
  allCategoryAtom,
} from "../../states";
import { useRecoilState, useRecoilCallback, atom } from "recoil";

import { useStorage, useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";
import { useTranslation } from "react-i18next";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from "expo-image-picker";
type ImagePickerResult = ImagePicker.ImagePickerResult & {
  cancelled?: boolean;
};

const vndMask = createNumberMask({
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
      stock?: number;
      minStock?: number;
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
    stock: number;
    minStock: number;
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
  }, []);

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
          style: "cancel",
        },
      ],
      {
        cancelable: true,
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
    refreshProductList();
  }, []);
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
      if (newPhotoID) {
        const photoUrl = await getFileView(newPhotoID);
        if (photoUrl) {
          data.photoUrl = newPhotoID;
        }
      }

      if (newPhotoID && typeof newPhotoID === "string") {
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

  return (
    <Layout level="1" style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Phần ảnh */}
        <View style={styles.photoSection as ViewStyle}>
          <View style={styles.photoPreviewContainer as ViewStyle}>
            {photo && (
              <Image
                source={{ uri: photo.uri }}
                style={styles.photoPreview as ImageStyle}
              />
            )}
          </View>
          <View style={styles.photoButtonsContainer as ViewStyle}>
            <Button
              style={styles.photoButton as ViewStyle}
              status="primary"
              size="small"
              accessoryLeft={(props) => <Icon {...props} name="image" />}
              onPress={handleChoosePhotoFromLibrary}
            >
              {t("gallery")}
            </Button>
            <Button
              style={styles.photoButton as ViewStyle}
              status="info"
              size="small"
              accessoryLeft={(props) => <Icon {...props} name="camera" />}
              onPress={handleTakePhotoFromCamera}
            >
              {t("camera")}
            </Button>
          </View>
        </View>

        {/* Thông tin sản phẩm */}
        <Card style={styles.formCard as ViewStyle}>
          <Text category="h6" style={styles.formTitle as TextStyle}>
            {t("product_details")}
          </Text>

          {/* Tên sản phẩm */}
          <Input
            style={styles.input as TextStyle}
            value={name}
            label={
              <Text style={styles.inputLabel as TextStyle}>
                {t("product_name")} <Text status="danger">*</Text>
              </Text>
            }
            placeholder={t("product_example")}
            caption={() => (required && !name ? requiredText() : <></>)}
            onChangeText={(nextValue) => setName(nextValue)}
            status={required && !name ? "danger" : "basic"}
          />

          {/* Mô tả sản phẩm */}
          <Input
            style={styles.textArea as TextStyle}
            value={description}
            label={
              <Text style={styles.inputLabel as TextStyle}>
                {t("product_description")}
              </Text>
            }
            placeholder={t("enter_description")}
            multiline={true}
            textStyle={{ minHeight: 80 }}
            onChangeText={(nextValue) => setDescription(nextValue)}
          />

          {/* Giá và chi phí */}
          <View style={styles.rowContainer as ViewStyle}>
            <Input
              {...useMaskedInputProps({
                value: price || "",
                onChangeText: (masked, unmasked) => setPrice(unmasked),
                mask: vndMask,
              })}
              style={styles.halfInput as TextStyle}
              inputMode="numeric"
              label={
                <Text style={styles.inputLabel as TextStyle}>
                  {t("price")} <Text status="danger">*</Text>
                </Text>
              }
              placeholder="0.000"
              caption={() => (required && !price ? requiredText() : <></>)}
              status={required && !price ? "danger" : "basic"}
              accessoryLeft={(props) => (
                <Icon {...props} name="pricetags-outline" />
              )}
            />

            <Input
              {...useMaskedInputProps({
                value: cost || "",
                onChangeText: (masked, unmasked) => setCost(unmasked),
                mask: vndMask,
              })}
              style={styles.halfInput as TextStyle}
              inputMode="numeric"
              label={
                <Text style={styles.inputLabel as TextStyle}>{t("cost")}</Text>
              }
              placeholder="0.000"
              accessoryLeft={(props) => (
                <Icon {...props} name="shopping-bag-outline" />
              )}
            />
          </View>

          {/* Tồn kho và ngưỡng */}
          <View style={styles.rowContainer as ViewStyle}>
            <Input
              {...useMaskedInputProps({
                value: stock || "",
                onChangeText: (masked, unmasked) => setStock(unmasked),
                mask: vndMask,
              })}
              style={styles.halfInput as TextStyle}
              inputMode="numeric"
              label={
                <Text style={styles.inputLabel as TextStyle}>{t("stock")}</Text>
              }
              placeholder="0"
              accessoryLeft={(props) => (
                <Icon {...props} name="archive-outline" />
              )}
            />

            <Input
              {...useMaskedInputProps({
                value: minStock || "",
                onChangeText: (masked, unmasked) => setMinStock(unmasked),
                mask: vndMask,
              })}
              style={styles.halfInput as TextStyle}
              inputMode="numeric"
              label={
                <Text style={styles.inputLabel as TextStyle}>
                  {t("min_stock")}
                </Text>
              }
              placeholder="0"
              accessoryLeft={(props) => (
                <Icon {...props} name="alert-triangle-outline" />
              )}
            />
          </View>

          {/* Danh mục */}
          <View style={styles.categoryContainer as ViewStyle}>
            <Text style={styles.inputLabel as TextStyle}>
              {t("category")} <Text status="danger">*</Text>
            </Text>
            <Select
              style={styles.categorySelect as ViewStyle}
              placeholder={t("choose_category")}
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
              status={
                required && selectedCategoryIndex.row === 0 ? "danger" : "basic"
              }
              multiSelect={false}
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
            {required && selectedCategoryIndex.row === 0 && requiredText()}
          </View>
        </Card>
      </ScrollView>

      {/* Nút chức năng */}
      {route.params.method === "create" ? (
        <View style={styles.buttonContainer as ViewStyle}>
          <Button
            style={styles.createMoreButton as ViewStyle}
            appearance="outline"
            status="primary"
            accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
            onPress={() => onCreate("create", false)}
            disabled={!name || !price || selectedCategoryIndex.row === 0}
          >
            {t("create_more")}
          </Button>
          <Button
            style={styles.doneButton as ViewStyle}
            status="primary"
            accessoryLeft={(props) => (
              <Icon {...props} name="checkmark-outline" />
            )}
            onPress={() => onCreate("create")}
          >
            {t("done")}
          </Button>
        </View>
      ) : (
        <View style={styles.buttonContainer as ViewStyle}>
          <Button
            style={styles.deleteButton as ViewStyle}
            appearance="outline"
            status="danger"
            accessoryLeft={(props) => (
              <Icon {...props} name="trash-2-outline" />
            )}
            onPress={() => onDelete()}
          >
            {t("delete")}
          </Button>
          <Button
            style={styles.updateButton as ViewStyle}
            status="primary"
            accessoryLeft={(props) => <Icon {...props} name="save-outline" />}
            onPress={() => onCreate("update")}
          >
            {t("update")}
          </Button>
        </View>
      )}
      <WaitingModal waiting={waiting} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80,
  },
  photoSection: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 16,
  },
  photoPreviewContainer: {
    alignSelf: "center",
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#e9ecef",
    borderWidth: 2,
    borderColor: "#dee2e6",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 75,
  } as ImageStyle,
  photoButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  photoButton: {
    margin: 8,
    borderRadius: 20,
  },
  formCard: {
    margin: 16,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    textAlign: "center",
    marginBottom: 16,
    color: "color-primary-600",
  },
  inputLabel: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "bold",
  },
  input: {
    marginBottom: 16,
    borderRadius: 6,
  },
  textArea: {
    marginBottom: 16,
    borderRadius: 6,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  halfInput: {
    width: "48%",
    borderRadius: 6,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categorySelect: {
    borderRadius: 6,
  },
  buttonContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    elevation: 5,
  },
  createMoreButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 30,
  },
  doneButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 30,
  },
  deleteButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 30,
  },
  updateButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 30,
  },
});

export default CreateProductScreen;
