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
} from "react-native";
import { useAccounts } from "../hook/AppWrite";
import { WaitingModal } from "../components/common";

const showAlert = (tilte, message) =>
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

const PasswordScreen = ({ onLoggedIn }) => {
  // Import basic
  const styles = useStyleSheet(styleSheet);
  const { getSession, login, updatePassword } = useAccounts();
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState(false);
  const [userInfo, setUserInfo] = useRecoilState(userAtom);

  // Define state variable
  const [alert, setAlert] = React.useState("");
  const [currentSession, setCurrentSession] = React.useState(null);

  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [secureTextEntry, setSecureTextEntry] = React.useState(true);

  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

  const renderIcon = (props): React.ReactElement => (
    <TouchableWithoutFeedback onPress={toggleSecureEntry}>
      <Icon {...props} name={secureTextEntry ? "eye-off" : "eye"} />
    </TouchableWithoutFeedback>
  );

  const renderCaption = (): React.ReactElement => {
    return (
      <View style={styles.captionContainer}>
        <Icon
          style={styles.captionIcon}
          fill="blue"
          name="alert-circle-outline"
        />
        <Text style={styles.captionText}>{t("password_requirement")}</Text>
      </View>
    );
  };

  const onSubmit = async () => {
    // if (newPassword !== confirmPassword) {
    // 	showAlert(t("inform"), t("password_not_match"));
    // } else {
    if (!oldPassword || !newPassword) {
      showAlert(t("inform"), t("enter_password"));
    } else {
      setWaiting(true);
      console.log("loginSubmit called::", oldPassword, newPassword);

      const result = await updatePassword(oldPassword, newPassword);
      console.log("changePassword result::", result);

      if (result.status) {
        showAlert(t("inform"), t("update_password_success"));
      } else {
        const message = result.message.startsWith("Invalid password")
          ? t("invalid_password")
          : t("invalid_credentials");
        showAlert(t("update_password_failure"), message);
      }

      setOldPassword("");
      setNewPassword("");
      setWaiting(false);
    }
    // }
  };

  return (
    <SafeAreaView>
      <Layout style={styles.loginLayout}>
        <View style={styles.loginHolder}>
          <Input
            value={oldPassword}
            label={t("old_password")}
            placeholder={t("old_password_placeholder")}
            caption={renderCaption}
            accessoryRight={renderIcon}
            secureTextEntry={secureTextEntry}
            onChangeText={(nextValue) => setOldPassword(nextValue)}
          />
          <Input
            value={newPassword}
            label={t("new_password")}
            placeholder={t("new_password_placeholder")}
            caption={renderCaption}
            accessoryRight={renderIcon}
            secureTextEntry={secureTextEntry}
            onChangeText={(nextValue) => setNewPassword(nextValue)}
          />
          <Button
            style={styles.submitButton}
            appearance="outline"
            // accessoryLeft={(props): IconElement => (
            //   <Icon
            //     {...props}
            //     name={theme.theme === "light" ? "moon" : "moon-outline"}
            //   />
            // )}
            onPress={() => onSubmit()}
          >
            {`${t("change")}`}
          </Button>
          <Text style={{ textAlign: "center" }}>{alert}</Text>
        </View>
      </Layout>
      <WaitingModal waiting={waiting} />
    </SafeAreaView>
  );
};

const styleSheet = StyleService.create({
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
    // justifyContent: "center",
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
