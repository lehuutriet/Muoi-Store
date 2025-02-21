import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { userAtom } from "../states";
import { useTranslation } from "react-i18next";
import { IconProps } from "@ui-kitten/components";
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

interface Styles {
  backgroundImg: ViewStyle;
  loginLayout: ViewStyle;
  loginHolder: ViewStyle;
  captionContainer: ViewStyle;
  captionIcon: ImageStyle;
  captionText: TextStyle;
  submitButton: ViewStyle;
}

interface Session {
  userId?: string;
  $id?: string;
  providerUid?: string;
}

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
  const [alert, setAlert] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Animation background
  const initialValue = 0;
  const translateValue = React.useRef(new Animated.Value(initialValue)).current;
  const AnimatedImage = React.useRef(
    Animated.createAnimatedComponent(ImageBackground)
  ).current;

  // Background animation
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

  // Tách riêng phần check session, cho chạy sau khi UI đã render
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentSession = await getSession();
        if (
          currentSession &&
          typeof currentSession !== "string" &&
          currentSession.userId
        ) {
          setUserInfo((prev) => ({ ...prev, id: currentSession.userId }));
          onLoggedIn();
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };

    checkSession();
  }, []);

  const translateAnimation = translateValue.interpolate({
    inputRange: [INPUT_RANGE_START, INPUT_RANGE_END],
    outputRange: [OUTPUT_RANGE_START, OUTPUT_RANGE_END],
  });

  const toggleSecureEntry = (): void => {
    setSecureTextEntry(!secureTextEntry);
  };

  const renderIcon = (props: IconProps): React.ReactElement => (
    <TouchableWithoutFeedback onPress={toggleSecureEntry}>
      <Icon {...props} name={secureTextEntry ? "eye-off" : "eye"} />
    </TouchableWithoutFeedback>
  );

  const renderCaption = (): React.ReactElement => {
    return (
      <View style={styles.captionContainer as ViewStyle}>
        <Icon
          style={styles.captionIcon as ImageStyle}
          fill="blue"
          name="alert-circle-outline"
        />
        <Text style={styles.captionText as TextStyle}>
          {t("password_requirement")}
        </Text>
      </View>
    );
  };

  const loginSubmit = async () => {
    if (!user || !password) return;

    setWaiting(true);
    try {
      const loginStatus = await login(user, password);

      if (
        loginStatus &&
        typeof loginStatus !== "string" &&
        loginStatus.userId
      ) {
        await Promise.all([
          setUserInfo({ ...userInfo, id: loginStatus.userId }),
          setAlert(`${t("login_success")}`),
        ]);

        onLoggedIn();
      }
    } finally {
      setWaiting(false);
    }
  };

  return (
    <SafeAreaView>
      <Layout style={styles.loginLayout as ViewStyle}>
        <AnimatedImage
          resizeMode="repeat"
          style={[
            styles.backgroundImg as ViewStyle,
            {
              transform: [
                {
                  translateX: translateAnimation,
                },
                {
                  translateY: translateAnimation,
                },
              ],
            } as ViewStyle,
          ]}
          source={require("../../assets/icons/background.png")}
        />
        <View style={styles.loginHolder as ViewStyle}>
          <Text
            category="h1"
            style={{ textAlign: "center" } as TextStyle}
          >{`${t("app_name")}`}</Text>
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
            style={styles.submitButton as ViewStyle}
            appearance="outline"
            onPress={loginSubmit}
          >
            {`${t("login")}`}
          </Button>
          <Text style={{ textAlign: "center" } as TextStyle}>{alert}</Text>
        </View>
      </Layout>
      <WaitingModal waiting={waiting} />
    </SafeAreaView>
  );
};

const styleSheet = StyleService.create<Styles>({
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
    justifyContent: "center",
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

export default LoginScreen;
