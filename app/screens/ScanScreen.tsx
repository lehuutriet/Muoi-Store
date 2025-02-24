import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { Audio } from "expo-av";
import { Camera as ExpoCamera, BarcodeScanningResult } from "expo-camera";

import { Button } from "react-native-elements";
import { DeviceMotion } from "expo-sensors";
import { StyleService, useStyleSheet } from "@ui-kitten/components";

interface ScanScreenProps {
  onBarcodeScanned: (code: string) => void;
  delay?: number;
}

const ScanScreen: React.FC<ScanScreenProps> = ({
  onBarcodeScanned,
  delay = 2000,
}) => {
  const styles = useStyleSheet(styleSheet);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [cameraActive, setCameraActive] = useState(true);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canScan = useRef(true);
  const Camera = ExpoCamera as any;
  useEffect(() => {
    DeviceMotion.setUpdateInterval(500);
    const subscription = DeviceMotion.addListener((motionData) => {
      const { acceleration } = motionData;
      if (acceleration) {
        const totalAcceleration = Math.sqrt(
          Math.pow(acceleration.x || 0, 2) +
            Math.pow(acceleration.y || 0, 2) +
            Math.pow(acceleration.z || 0, 2)
        );

        if (totalAcceleration > 1.2) {
          if (!cameraActive) {
            setCameraActive(true);
          }
          if (idleTimeoutRef.current) {
            clearTimeout(idleTimeoutRef.current);
          }
          idleTimeoutRef.current = setTimeout(() => {
            setCameraActive(false);
          }, 15000);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [cameraActive]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  async function playSound() {
    const { sound } = await Audio.Sound.createAsync(
      require("../../assets/sounds/beep.mp3")
    );
    setSound(sound);
    await sound.playAsync();
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const activateScanner = () => {
    setCameraActive(true);
  };

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (!canScan.current) {
      return;
    }

    canScan.current = false;
    setTimeout(() => {
      canScan.current = true;
    }, delay);

    playSound();
    setScannedCode(data);
    setTimeout(() => setScannedCode(null), delay);
    if (onBarcodeScanned) {
      onBarcodeScanned(data);
    }
  };

  if (hasPermission === null) {
    return <Text>Chờ cấp quyền camera</Text>;
  }
  if (hasPermission === false) {
    return <Text>Chưa thể truy cập camera</Text>;
  }

  return (
    <View style={styles.container as ViewStyle}>
      {cameraActive ? (
        <Camera
          style={StyleSheet.absoluteFillObject}
          onBarCodeScanned={canScan.current ? handleBarCodeScanned : undefined}
          barCodeScannerSettings={{
            barCodeTypes: ["qr", "code128", "code39", "ean13", "ean8", "upc_e"],
          }}
        />
      ) : (
        <View style={styles.cameraPlaceholder as ViewStyle}>
          <Text style={styles.overlayText as TextStyle}>
            Camera tự nghỉ sau 15 giây!
          </Text>
          <Button title="Mở máy quét" onPress={activateScanner} />
        </View>
      )}
      {scannedCode && (
        <View style={styles.overlay as ViewStyle}>
          <Text style={styles.overlayText as TextStyle}>{scannedCode}</Text>
        </View>
      )}
    </View>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  overlay: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  overlayText: {
    fontSize: 24,
    color: "white",
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
});

export default ScanScreen;
