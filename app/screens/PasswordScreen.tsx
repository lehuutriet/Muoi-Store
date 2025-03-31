import React, { useState, useEffect } from "react";
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
  Card,
  TopNavigation,
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
  ScrollView,
} from "react-native";
import { useAccounts } from "../hook/AppWrite";
import { WaitingModal } from "../components/common";
import { LinearGradient } from "expo-linear-gradient";

// Định nghĩa kiểu linh hoạt hơn để phù hợp với cả hai cách sử dụng
interface PasswordScreenCustomProps {
  onLoggedIn?: () => void;
  route?: { params?: { onLoggedIn?: () => void } };
  navigation?: any;
}

interface StyleType {
  container: ViewStyle;
  scrollView: ViewStyle;
  cardContainer: ViewStyle;
  card: ViewStyle;
  cardHeader: ViewStyle;
  cardTitle: TextStyle;
  formGroup: ViewStyle;
  inputLabel: TextStyle;
  inputField: ViewStyle;
  captionContainer: ViewStyle;
  captionIcon: ImageStyle;
  captionText: TextStyle;
  errorText: TextStyle;
  buttonContainer: ViewStyle;
  submitButton: ViewStyle;
  gradient: ViewStyle;
  passwordMatch: TextStyle;
  passwordNoMatch: TextStyle;
  strengthIndicatorContainer: ViewStyle;
  strengthBar: ViewStyle;
  strengthText: TextStyle;
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
        text: "OK",
        style: "default",
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
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  // Kiểm tra mật khẩu xác nhận có khớp với mật khẩu mới không
  useEffect(() => {
    if (confirmPassword) {
      setPasswordsMatch(newPassword === confirmPassword);
    } else {
      setPasswordsMatch(null);
    }
  }, [newPassword, confirmPassword]);

  // Đánh giá độ mạnh của mật khẩu
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;

    // Độ dài tối thiểu
    if (newPassword.length >= 8) strength += 1;

    // Có chữ hoa
    if (/[A-Z]/.test(newPassword)) strength += 1;

    // Có chữ thường
    if (/[a-z]/.test(newPassword)) strength += 1;

    // Có số
    if (/[0-9]/.test(newPassword)) strength += 1;

    // Có ký tự đặc biệt
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;

    setPasswordStrength(strength);
  }, [newPassword]);

  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

  const renderIcon = (props: RenderIconProps) => (
    <TouchableWithoutFeedback onPress={toggleSecureEntry}>
      <Icon {...props} name={secureTextEntry ? "eye-off" : "eye"} />
    </TouchableWithoutFeedback>
  );

  const renderPasswordCaption = (): React.ReactElement => {
    return (
      <View style={styles.captionContainer as ViewStyle}>
        <Icon style={styles.captionIcon} fill="#6C5CE7" name="info-outline" />
        <Text style={styles.captionText as TextStyle}>
          {t("password_requirement")}
        </Text>
      </View>
    );
  };

  const renderPasswordStrength = (): React.ReactElement => {
    const getStrengthColor = () => {
      if (passwordStrength <= 1) return "#FF5252";
      if (passwordStrength <= 3) return "#FFC107";
      return "#4CAF50";
    };

    const getStrengthText = () => {
      if (passwordStrength <= 1) return t("weak");
      if (passwordStrength <= 3) return t("medium");
      return t("strong");
    };

    return (
      <>
        <View style={styles.strengthIndicatorContainer as ViewStyle}>
          <View
            style={[
              styles.strengthBar as ViewStyle,
              {
                width: `${passwordStrength * 20}%`,
                backgroundColor: getStrengthColor(),
              },
            ]}
          />
        </View>
        {newPassword && (
          <Text
            style={[
              styles.strengthText as TextStyle,
              { color: getStrengthColor() },
            ]}
          >
            {getStrengthText()}
          </Text>
        )}
      </>
    );
  };

  const renderConfirmPasswordCaption = (): React.ReactElement => {
    if (passwordsMatch === null) return <></>;

    return (
      <View style={styles.captionContainer as ViewStyle}>
        <Icon
          style={styles.captionIcon}
          fill={passwordsMatch ? "#4CAF50" : "#FF5252"}
          name={passwordsMatch ? "checkmark-circle-2" : "close-circle"}
        />
        <Text
          style={[
            passwordsMatch
              ? (styles.passwordMatch as TextStyle)
              : (styles.passwordNoMatch as TextStyle),
          ]}
        >
          {passwordsMatch ? t("passwords_match") : t("passwords_not_match")}
        </Text>
      </View>
    );
  };

  const onSubmit = async (): Promise<void> => {
    if (!oldPassword) {
      showAlert(t("inform"), t("enter_old_password"));
      return;
    }

    if (!newPassword) {
      showAlert(t("inform"), t("enter_new_password"));
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert(t("inform"), t("passwords_must_match"));
      return;
    }

    if (passwordStrength < 3) {
      showAlert(t("inform"), t("password_too_weak"));
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
      setConfirmPassword("");
      setWaiting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container as ViewStyle}>
      <ScrollView
        style={styles.scrollView as ViewStyle}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.cardContainer as ViewStyle}>
          <Card style={styles.card as ViewStyle}>
            <LinearGradient
              colors={["rgba(108, 92, 231, 0.1)", "rgba(108, 92, 231, 0.05)"]}
              style={styles.gradient as ViewStyle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View style={styles.cardHeader as ViewStyle}>
              <Text category="h5" style={styles.cardTitle as TextStyle}>
                {t("change_password")}
              </Text>
            </View>

            <View style={styles.formGroup as ViewStyle}>
              <Text style={styles.inputLabel as TextStyle}>
                {t("old_password")}
              </Text>
              <Input
                style={styles.inputField as TextStyle}
                value={oldPassword}
                placeholder={t("old_password_placeholder")}
                accessoryRight={(props) => renderIcon(props as RenderIconProps)}
                secureTextEntry={secureTextEntry}
                onChangeText={(nextValue: string) => setOldPassword(nextValue)}
                size="large"
              />
            </View>

            <View style={styles.formGroup as ViewStyle}>
              <Text style={styles.inputLabel as TextStyle}>
                {t("new_password")}
              </Text>
              <Input
                style={styles.inputField as TextStyle}
                value={newPassword}
                placeholder={t("new_password_placeholder")}
                caption={renderPasswordCaption}
                accessoryRight={(props) => renderIcon(props as RenderIconProps)}
                secureTextEntry={secureTextEntry}
                onChangeText={(nextValue: string) => setNewPassword(nextValue)}
                size="large"
              />
              {renderPasswordStrength()}
            </View>

            <View style={styles.formGroup as ViewStyle}>
              <Text style={styles.inputLabel as TextStyle}>
                {t("confirm_password")}
              </Text>
              <Input
                style={styles.inputField as TextStyle}
                value={confirmPassword}
                placeholder={t("confirm_password_placeholder")}
                caption={renderConfirmPasswordCaption}
                accessoryRight={(props) => renderIcon(props as RenderIconProps)}
                secureTextEntry={secureTextEntry}
                onChangeText={(nextValue: string) =>
                  setConfirmPassword(nextValue)
                }
                status={passwordsMatch === false ? "danger" : "basic"}
                size="large"
              />
            </View>

            <View style={styles.buttonContainer as ViewStyle}>
              <Button
                style={styles.submitButton as ViewStyle}
                status="primary"
                onPress={onSubmit}
                disabled={
                  !oldPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  passwordsMatch === false ||
                  passwordStrength < 3
                }
                size="large"
                accessoryLeft={(props) => (
                  <Icon {...props} name="save-outline" />
                )}
              >
                {t("change_password")}
              </Button>
            </View>

            {alert ? (
              <Text style={styles.errorText as TextStyle}>{alert}</Text>
            ) : null}
          </Card>
        </View>
      </ScrollView>
      <WaitingModal waiting={waiting} />
    </SafeAreaView>
  );
};

const styleSheet = StyleService.create<StyleType>({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  },
  scrollView: {
    flex: 1,
  },
  cardContainer: {
    padding: 20,
    marginTop: 20,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 20,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardHeader: {
    marginBottom: 20,
    alignItems: "center",
  },
  cardTitle: {
    fontWeight: "bold",
    color: "color-primary-700",
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "text-basic-color",
  },
  inputField: {
    borderRadius: 8,
  },
  captionContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  captionIcon: {
    width: 16,
    height: 16,
    marginRight: 5,
  },
  captionText: {
    fontSize: 12,
    fontWeight: "400",
    color: "text-hint-color",
  },
  errorText: {
    color: "color-danger-500",
    textAlign: "center",
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: 16,
  },
  submitButton: {
    borderRadius: 8,
  },
  passwordMatch: {
    fontSize: 12,
    color: "color-success-600",
  },
  passwordNoMatch: {
    fontSize: 12,
    color: "color-danger-600",
  },
  strengthIndicatorContainer: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginTop: 8,
    width: "100%",
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
});

export default PasswordScreen;
