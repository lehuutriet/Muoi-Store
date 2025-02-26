import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import * as SplashScreen from "expo-splash-screen";
import "./i18/i18n.config";
import { RecoilRoot } from "recoil";
import { ApplicationProvider, IconRegistry } from "@ui-kitten/components";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useTranslation } from "react-i18next";
import { createStackNavigator } from "@react-navigation/stack";

import {
  Animated,
  Platform,
  StatusBar,
  Linking,
  Alert,
  View,
  Text,
  Button,
} from "react-native";
import { createAppwriteClient, useDatabases } from "./hook/AppWrite";
import * as eva from "@eva-design/eva";
import { EvaIconsPack } from "@ui-kitten/eva-icons";
import { default as mapping } from "./ui-kitten/mapping.json";
import {
  ThemeContext,
  DrawerContext,
  AppwriteContext,
} from "./contexts/AppContext";
import { BLEProvider } from "./hook/BLEContext";
import * as RootNavigation from "./navigator/RootNavigation";
import Drawer from "./navigator/Drawer";
import LoginScreen from "./screens/LoginScreen";
import remoteConfig from "@react-native-firebase/remote-config";
import * as Application from "expo-application";
import { compareVersions } from "compare-versions";
const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const PROJECT_ID = "66a085e60016a161b67b";
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      // alert("Failed to get push token for push notification!");
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert("Must use physical device for Push Notifications");
  }
  return token;
}

interface AnimatedAppLoaderProps {
  children: React.ReactNode;
}

function AnimatedAppLoader({ children }: AnimatedAppLoaderProps) {
  return <AnimatedSplashScreen>{children}</AnimatedSplashScreen>;
}

interface AnimatedSplashScreenProps {
  children: React.ReactNode;
}

function AnimatedSplashScreen({ children }: AnimatedSplashScreenProps) {
  const animation = useMemo(() => new Animated.Value(1), []);
  const [isAppReady, setAppReady] = useState(false);
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (isAppReady) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => setAnimationComplete(true));
    }
  }, [isAppReady]);

  const onImageLoaded = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
      await Promise.all([]);
    } catch (e) {
      // handle errors
    } finally {
      setAppReady(true);
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {isAppReady && children}
      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              backgroundColor: "#ffffff",
              opacity: animation,
            },
          ]}
        >
          <Animated.Image
            style={{
              width: "100%",
              height: "100%",
              resizeMode: "contain",
              transform: [
                {
                  scale: animation,
                },
              ],
            }}
            source={require("../assets/images/iconshop.png")}
            onLoadEnd={onImageLoaded}
            fadeDuration={0}
          />
        </Animated.View>
      )}
    </View>
  );
}

function App() {
  return (
    <AnimatedAppLoader>
      <MainScreen />
    </AnimatedAppLoader>
  );
}
type RootStackParamList = {
  Login: {
    onLoggedIn: () => void;
  };
  Main: {
    pushToken: string;
    onLoggedOut: () => void;
  };
};
function MainScreen() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setDrawer] = useState(false);
  const [appwrite, setAppwrite] = useState<any>(null);
  const [pushToken, setPushToken] = useState<string>("");
  const Stack = createStackNavigator<RootStackParamList>();

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  };

  const toggleDrawer = () => {
    const nextState = !open;
    setDrawer(nextState);
  };

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    const initAppwrite = async () => {
      const aw = createAppwriteClient(APPWRITE_ENDPOINT, PROJECT_ID);
      setAppwrite(aw);
    };

    initAppwrite();
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setPushToken(token);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("notificationListener::", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("responseListener::", response);
        RootNavigation.navigate("ReviewOrderScreen", {
          orderInfo: response.notification.request.content.data.eventData,
        });
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <>
      <StatusBar barStyle={"dark-content"} />
      <IconRegistry icons={EvaIconsPack} />
      <RecoilRoot>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <DrawerContext.Provider value={{ open, toggleDrawer }}>
            {appwrite && (
              <AppwriteContext.Provider value={appwrite}>
                <ApplicationProvider
                  customMapping={{ ...eva.mapping, ...mapping }}
                  {...eva}
                  theme={eva[theme]}
                >
                  <NavigationIndependentTree>
                    <BLEProvider>
                      <NavigationContainer ref={RootNavigation.navigationRef}>
                        <Stack.Navigator screenOptions={{ headerShown: false }}>
                          {/* <Stack.Screen
                          name="Main"
                          component={Drawer}
                          initialParams={{
                            pushToken: pushToken,
                            onLoggedOut: () => setIsLoggedIn(false),
                          }}
                          options={{ headerShown: false }}
                        /> */}
                          {!isLoggedIn ? (
                            <Stack.Screen
                              name="Login"
                              component={LoginScreen}
                              initialParams={{
                                onLoggedIn: () => setIsLoggedIn(true),
                              }}
                              options={{ headerShown: false }}
                            />
                          ) : (
                            <Stack.Screen
                              name="Main"
                              component={Drawer}
                              initialParams={{
                                pushToken: pushToken,
                                onLoggedOut: () => {
                                  console.log(
                                    "onLoggedOut trong index.tsx được gọi"
                                  );
                                  setIsLoggedIn(false);
                                },
                              }}
                              options={{ headerShown: false }}
                            />
                          )}
                        </Stack.Navigator>
                      </NavigationContainer>
                    </BLEProvider>
                  </NavigationIndependentTree>
                </ApplicationProvider>
              </AppwriteContext.Provider>
            )}
          </DrawerContext.Provider>
        </ThemeContext.Provider>
      </RecoilRoot>
    </>
  );
}

export default App;
