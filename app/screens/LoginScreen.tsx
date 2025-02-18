import React, { useEffect, useState } from "react";
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
  ViewStyle,
  ImageStyle,
  TextStyle,
} from "react-native";
import { useAccounts } from "../hook/AppWrite";
import { WaitingModal } from "../components/common";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

const INPUT_RANGE_START = 0;
const INPUT_RANGE_END = 1;
const OUTPUT_RANGE_START = -281;
const OUTPUT_RANGE_END = 0;
const ANIMATION_TO_VALUE = 1;
const ANIMATION_DURATION = 25000;

type RootStackParamList = {
  Login: {
    onLoggedIn: () => void;
  };
};

type LoginScreenProps = {
  route: RouteProp<RootStackParamList, "Login">;
  navigation: StackNavigationProp<RootStackParamList, "Login">;
};

const showAlert = (title: string, message: string) =>
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

const LoginScreen: React.FC<LoginScreenProps> = ({ route }) => {
  const { onLoggedIn } = route.params;
  const styles = useStyleSheet(styleSheet);
  const { getSession, login } = useAccounts();
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState(false);
  const [userInfo, setUserInfo] = useRecoilState(userAtom);

  // Animating background
  const initialValue = 0;
  const translateValue = React.useRef(new Animated.Value(initialValue)).current;
  const AnimatedImage = React.useRef(
    Animated.createAnimatedComponent(ImageBackground)
  ).current;

  useEffect(() => {
    const checkLogin = async () => {
      const currentSession = await getSession().catch(() => false);
      setCurrentSession(currentSession);
      if (currentSession === "error") showAlert(t("inform"), t("server_error"));
      if (currentSession && currentSession.userId) {
        setUserInfo({ ...userInfo, id: currentSession.userId });
        onLoggedIn();
      }
    };
    checkLogin();
  }, []);

  useEffect(() => {
    const translate = () => {
      translateValue.setValue(initialValue);
      Animated.timing(translateValue, {
        toValue: ANIMATION_TO_VALUE,
        duration: ANIMATION_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => translate());
    };
    translate();
  }, [translateValue]);

  const translateAnimation = translateValue.interpolate({
    inputRange: [INPUT_RANGE_START, INPUT_RANGE_END],
    outputRange: [OUTPUT_RANGE_START, OUTPUT_RANGE_END],
  });

  const [alert, setAlert] = useState("");
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

  const renderIcon = (props: any): React.ReactElement => (
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

  const loginSubmit = async () => {
    setWaiting(true);
    console.log("Login attempt with:", user, password);
    const loginStatus = await login(user, password);
    console.log("Login response:", loginStatus);
    if (loginStatus && loginStatus.userId) {
      setUserInfo({ ...userInfo, id: loginStatus.userId });
      setAlert(`${t("login_success")}`);
      onLoggedIn();
    }
    if (loginStatus === false) {
      setAlert(`${t("login_fail")}`);
    }
    if (loginStatus === "error") {
      showAlert(t("inform"), t("server_error"));
    }
    setWaiting(false);
  };

  return (
    <SafeAreaView>
      <Layout style={styles.loginLayout}>
        <AnimatedImage
          resizeMode="repeat"
          style={[
            styles.backgroundImg,
            {
              transform: [
                {
                  translateX: translateAnimation,
                },
                {
                  translateY: translateAnimation,
                },
              ],
            },
          ]}
          source={require("../../assets/icons/background.png")}
        />
        {currentSession === null ? (
          <View style={{ backgroundColor: "transparent", opacity: 0.5 }}>
            <Spinner status="info" size="giant" />
          </View>
        ) : (
          <View style={styles.loginHolder}>
            <Text category="h1" style={{ textAlign: "center" }}>{`${t(
              "app_name"
            )}`}</Text>
            <Input
              value={user}
              label={t("email")}
              placeholder={t("sample_email")}
              onChangeText={(nextValue) => setUser(nextValue)}
            />
            <Input
              value={password}
              label={t("password")}
              placeholder={t("password_placeholder")}
              caption={renderCaption}
              accessoryRight={renderIcon}
              secureTextEntry={secureTextEntry}
              onChangeText={(nextValue) => setPassword(nextValue)}
            />
            <Button
              style={styles.submitButton}
              appearance="outline"
              onPress={() => loginSubmit()}
            >
              {`${t("login")}`}
            </Button>
            <Text style={{ textAlign: "center" }}>{alert}</Text>
          </View>
        )}
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
  } as ViewStyle,
  loginLayout: {
    height: Dimensions.get("window").height,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  loginHolder: {
    width: "100%",
  } as ViewStyle,
  captionContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  captionIcon: {
    width: 10,
    height: 10,
    marginRight: 5,
  } as ImageStyle,
  captionText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#8F9BB3",
  } as TextStyle,
  submitButton: {
    marginTop: 20,
    marginBottom: 20,
  } as ViewStyle,
});

export default LoginScreen;
