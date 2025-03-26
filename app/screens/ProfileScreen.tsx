import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Text,
  Button,
  Input,
  Avatar,
  Spinner,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import {
  View,
  ScrollView,
  Alert,
  ViewStyle,
  ImageStyle,
  TextStyle,
} from "react-native";
import { useRecoilState } from "recoil";
import { userAtom } from "../states";
import { useAccounts, createAppwriteClient } from "../hook/AppWrite";
import { WaitingModal } from "../components/common";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const ProfileScreen = () => {
  const { t } = useTranslation();
  const styles = useStyleSheet(styleSheet);
  const [userInfo, setUserInfo] = useRecoilState(userAtom);
  const [storeName, setStoreName] = useState(userInfo.STORE_NAME || "");
  const [name, setName] = useState(userInfo.NAME || "");
  const [phone, setPhone] = useState(userInfo.PHONE || "");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(userInfo.ADDRESS || "");
  const [waiting, setWaiting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getUserPrefs, updateUserPrefs, getSession } = useAccounts();

  // Tạo một client Appwrite riêng để truy cập account
  const appwriteClient = createAppwriteClient(
    "https://cloud.appwrite.io/v1",
    "66a085e60016a161b67b"
  );

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    setLoading(true);
    try {
      // Lấy thông tin từ user preferences
      const prefs = await getUserPrefs();
      setStoreName("");
      setStoreName(prefs.STORE_NAME || ""); // Sửa lại đúng cách
      setName(prefs.NAME || "");
      setPhone(prefs.PHONE || "");
      setAddress(prefs.ADDRESS || "");

      // Lấy thông tin tài khoản từ Appwrite
      try {
        const sessionInfo = await getSession();

        // Kiểm tra nếu có session và appwriteClient đã được khởi tạo
        if (
          sessionInfo &&
          typeof sessionInfo !== "string" &&
          appwriteClient &&
          appwriteClient.account
        ) {
          // Lấy thông tin email từ AsyncStorage nếu không thể truy cập trực tiếp vào account
          const storedEmail = await AsyncStorage.getItem("userEmail");
          if (storedEmail) {
            setEmail(storedEmail);
          }

          try {
            // Lấy thông tin người dùng từ account
            const accountInfo = await appwriteClient.account.get();
            if (accountInfo) {
              setEmail(accountInfo.email || storedEmail || "");
              // Nếu chưa có name trong prefs, sử dụng từ account
              if (!prefs.NAME && accountInfo.name) {
                setName(accountInfo.name);
              }
            }
          } catch (accountError) {
            console.error("Error getting account info:", accountError);
          }
        }
      } catch (sessionError) {
        console.error("Error getting session:", sessionError);
      }
    } catch (error) {
      console.error("Error loading user info:", error);
      Alert.alert(t("error"), t("failed_to_load_profile"));
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    React.useCallback(() => {
      loadUserInfo();
      return () => {};
    }, [])
  );
  const saveUserInfo = async () => {
    setWaiting(true);
    try {
      // Tạo object mới để cập nhật
      const updatedPrefs = {
        ...userInfo,
        STORE_NAME: storeName,
        NAME: name,
        PHONE: phone,
        ADDRESS: address,
      };

      console.log("Saving prefs:", updatedPrefs); // Debug để xem dữ liệu đang lưu

      const result = await updateUserPrefs(updatedPrefs);

      if (result) {
        // Cập nhật state atom để ứng dụng đồng bộ
        setUserInfo(updatedPrefs);

        // Lưu vào AsyncStorage riêng để đảm bảo dữ liệu được lưu trữ
        await AsyncStorage.setItem("userPrefs", JSON.stringify(updatedPrefs));

        Alert.alert(t("success"), t("profile_updated_successfully"));
      } else {
        Alert.alert(t("error"), t("failed_to_update_profile"));
      }
    } catch (error) {
      console.error("Error saving user info:", error);
      Alert.alert(t("error"), t("something_went_wrong"));
    } finally {
      setWaiting(false);
    }
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer as ViewStyle}>
        <Spinner size="large" />
        <Text style={styles.loadingText as TextStyle}>
          {t("loading_profile")}
        </Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container as ViewStyle}>
      <ScrollView
        style={styles.scrollView as ViewStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader as ViewStyle}>
          <Avatar
            style={styles.avatar as ImageStyle}
            size="giant"
            source={require("../../assets/images/iconshop.png")}
          />
          <Text category="h6" style={styles.nameText as TextStyle}>
            {name || t("your_name")}
          </Text>
          <Text category="s1" style={styles.emailText as TextStyle}>
            {email}
          </Text>
        </View>

        <View style={styles.formContainer as ViewStyle}>
          <Input
            label={t("store_name")}
            value={storeName}
            onChangeText={setStoreName}
            style={styles.input as TextStyle}
            placeholder={t("enter_store_name")}
          />

          <Input
            label={t("your_name")}
            value={name}
            onChangeText={setName}
            style={styles.input as TextStyle}
            placeholder={t("enter_your_name")}
          />

          <Input
            label={t("phone_number")}
            value={phone}
            onChangeText={setPhone}
            style={styles.input as TextStyle}
            placeholder={t("enter_phone_number")}
            keyboardType="phone-pad"
          />

          <Input
            label={t("address")}
            value={address}
            onChangeText={setAddress}
            style={styles.input as TextStyle}
            placeholder={t("enter_address")}
            multiline={true}
            textStyle={{ minHeight: 64 }}
          />

          <Button style={styles.saveButton as ViewStyle} onPress={saveUserInfo}>
            {t("save_changes")}
          </Button>
        </View>
      </ScrollView>
      <WaitingModal waiting={waiting} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "text-hint-color",
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "color-primary-500",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "background-basic-color-1",
  },
  nameText: {
    color: "color-basic-100",
    fontWeight: "bold",
  },
  emailText: {
    color: "color-basic-200",
    marginTop: 4,
  },
  formContainer: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
    borderRadius: 12,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default ProfileScreen;
