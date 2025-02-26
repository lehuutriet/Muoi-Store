import React, { useState } from "react";
import { useRecoilState } from "recoil";
import { userAtom } from "../states";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Input,
  Text,
  Button,
  Icon,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import {
  Alert,
  TouchableWithoutFeedback,
  View,
  SafeAreaView,
  Dimensions,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useAccounts } from "../hook/AppWrite";
import { WaitingModal } from "../components/common";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Định nghĩa kiểu linh hoạt hơn để phù hợp với cả hai cách sử dụng
interface PasswordScreenCustomProps {
  onLoggedIn?: () => void;
  route?: { params?: { onLoggedIn?: () => void } };
  navigation?: any;
}

interface StyleType {
  backgroundImg: ViewStyle;
  loginLayout: ViewStyle;
  loginHolder: ViewStyle;
  captionContainer: ViewStyle;
  captionIcon: ImageStyle;
  captionText: TextStyle;
  submitButton: ViewStyle;
}

interface RenderIconProps {
  style: ImageStyle;
  fill?: string;
  name: string;
}

const showAlert = (title: string, message: string): void => {
  Alert.alert(
    title,
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
};

// Sử dụng định nghĩa props linh hoạt hơn
const PasswordScreen: React.FC<PasswordScreenCustomProps> = (props) => {
  // Lấy onLoggedIn từ props hoặc route.params
  const onLoggedIn = props.onLoggedIn || props.route?.params?.onLoggedIn;

  const styles = useStyleSheet(styleSheet);
  const { updatePassword } = useAccounts();
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useRecoilState(userAtom);

  const [alert, setAlert] = useState<string>("");
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);

  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

  const renderIcon = (props: RenderIconProps) => (
    <TouchableWithoutFeedback onPress={toggleSecureEntry}>
      <Icon {...props} name={secureTextEntry ? "eye-off" : "eye"} />
    </TouchableWithoutFeedback>
  );

  const renderCaption = (): React.ReactElement => {
    return (
      <View style={styles.captionContainer as ViewStyle}>
        <Icon
          style={styles.captionIcon}
          fill="blue"
          name="alert-circle-outline"
        />
        <Text style={styles.captionText as TextStyle}>
          {t("password_requirement")}
        </Text>
      </View>
    );
  };

  const onSubmit = async (): Promise<void> => {
    if (!oldPassword || !newPassword) {
      showAlert(t("inform"), t("enter_password"));
      return;
    }

    setWaiting(true);

    try {
      const result = await updatePassword(oldPassword, newPassword);

      if ("message" in result) {
        if (result.status) {
          showAlert(t("inform"), t("update_password_success"));
          if (onLoggedIn) {
            onLoggedIn();
          }
        } else {
          const message = result.message.startsWith("Invalid password")
            ? t("invalid_password")
            : t("invalid_credentials");
          showAlert(t("update_password_failure"), message);
        }
      } else {
        showAlert(t("inform"), t("update_password_success"));
        if (onLoggedIn) {
          onLoggedIn();
        }
      }
    } catch (error) {
      showAlert(t("error"), t("update_password_error"));
    } finally {
      setOldPassword("");
      setNewPassword("");
      setWaiting(false);
    }
  };

  return (
    <SafeAreaView>
      <Layout style={styles.loginLayout as ViewStyle}>
        <View style={styles.loginHolder as ViewStyle}>
          <Input
            value={oldPassword}
            label={t("old_password")}
            placeholder={t("old_password_placeholder")}
            caption={renderCaption}
            accessoryRight={(props) => renderIcon(props as RenderIconProps)}
            secureTextEntry={secureTextEntry}
            onChangeText={(nextValue: string) => setOldPassword(nextValue)}
          />
          <Input
            value={newPassword}
            label={t("new_password")}
            placeholder={t("new_password_placeholder")}
            caption={renderCaption}
            accessoryRight={(props) => renderIcon(props as RenderIconProps)}
            secureTextEntry={secureTextEntry}
            onChangeText={(nextValue: string) => setNewPassword(nextValue)}
          />
          <Button
            style={styles.submitButton as ViewStyle}
            appearance="outline"
            onPress={onSubmit}
          >
            {t("change")}
          </Button>
          <Text style={{ textAlign: "center" }}>{alert}</Text>
        </View>
      </Layout>
      <WaitingModal waiting={waiting} />
    </SafeAreaView>
  );
};

const styleSheet = StyleService.create<StyleType>({
  // Styles giữ nguyên
  backgroundImg: {
    position: "absolute",
    width: 1200,
    height: 1200,
    top: 0,
    opacity: 0.3,
    transform: [
      {
        translateX: 0,
      },
      {
        translateY: 0,
      },
    ],
  },
  loginLayout: {
    height: Dimensions.get("window").height,
    padding: 20,
    alignItems: "center",
  },
  loginHolder: {
    width: "100%",
  },
  captionContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  captionIcon: {
    width: 10,
    height: 10,
    marginRight: 5,
  },
  captionText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#8F9FB3",
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 20,
  },
});

export default PasswordScreen;
