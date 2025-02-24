import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRecoilState } from "recoil";
import { userAtom } from "../states";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Input,
  Text,
  Button,
  Icon,
  Spinner,
  Modal,
  Card,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import {
  Alert,
  TouchableWithoutFeedback,
  View,
  SafeAreaView,
  Dimensions,
  Animated,
  Easing,
  ImageBackground,
  BackHandler,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useAccounts } from "../hook/AppWrite";
import { WaitingModal } from "../components/common";

interface PasswordScreenProps {
  onLoggedIn: () => void;
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

interface Session {
  $id: string;
  userId: string;
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

const PasswordScreen: React.FC<PasswordScreenProps> = ({ onLoggedIn }) => {
  const styles = useStyleSheet(styleSheet);
  const { getSession, login, updatePassword } = useAccounts();
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useRecoilState(userAtom);

  const [alert, setAlert] = useState<string>("");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

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

      // Kiểm tra xem result có phải là UpdatePasswordResponse không
      if ("message" in result) {
        if (result.status) {
          showAlert(t("inform"), t("update_password_success"));
        } else {
          const message = result.message.startsWith("Invalid password")
            ? t("invalid_password")
            : t("invalid_credentials");
          showAlert(t("update_password_failure"), message);
        }
      } else {
        showAlert(t("inform"), t("update_password_success"));
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
    color: "#8F9BB3",
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 20,
  },
});

export default PasswordScreen;
