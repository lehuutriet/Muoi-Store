import React, {
  createContext,
  useRef,
  useContext,
  useState,
  useEffect,
} from "react";
import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { connectedDevice, foundDevice, deviceScan } from "../states";
import { useRecoilState } from "recoil";
import { PermissionsAndroid, Platform, Alert } from "react-native";
import { Buffer } from "buffer";
import * as RootNavigation from "../navigator/RootNavigation";

interface PrintService {
  service_uuid: string;
  characteristic_uuid: string;
}

interface Service {
  device: Device;
  uuid: string;
  characteristics(): Promise<Characteristic[]>;
}

interface InstructionType {
  SERVICE_UUID: string;
  CHARACTERISTIC_UUID: string;
}

interface BLEContextType {
  manager: BleManager | null;
  device: React.RefObject<Device | null>;
  printService: PrintService | null;
  devices: Device[];
  startScanning: () => void;
  stopScanning: () => void;
  isScanning: boolean;
  selectDevice: (deviceId: string) => Promise<boolean>;
  connetedDevice: Device[];
  disconnectFromDevice: (deviceId: string) => Promise<void>;
  printContent: (content: string) => Promise<boolean>;
}

const BLEContext = createContext<BLEContextType | null>(null);

// Khởi tạo BleManager ngoài component để tránh tạo nhiều instances
let bleManagerInstance: BleManager | null = null;

try {
  // Chỉ khởi tạo BleManager trên thiết bị thật (Android/iOS)
  if (Platform.OS === "android" || Platform.OS === "ios") {
    bleManagerInstance = new BleManager();
  }
} catch (error) {
  console.error("Không thể khởi tạo BleManager:", error);
  bleManagerInstance = null;
}

export const BLEProvider = ({ children }: { children: React.ReactNode }) => {
  const manager = bleManagerInstance;
  const device = useRef<Device | null>(null);
  const { t } = useTranslation();
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [printService, setPrintService] = useState<PrintService | null>(null);
  const [devices, setDevices] = useRecoilState<Device[]>(foundDevice);
  const [connetedDevice, setConnetedDevice] =
    useRecoilState<Device[]>(connectedDevice);
  const [isScanning, setIsScanning] = useRecoilState(deviceScan);

  const requestPermissions = async (cb: (granted: boolean) => void) => {
    if (Platform.OS === "android") {
      try {
        let grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        const granted = Object.values(grants).every(
          (grantStatus) => grantStatus === PermissionsAndroid.RESULTS.GRANTED
        );
        granted ? cb(true) : cb(false);
      } catch (error) {
        console.log("requestPermissions::", error);
        cb(false);
      }
    } else {
      cb(true);
    }
  };

  useEffect(() => {
    if (!manager) {
      console.log("BleManager không khả dụng");
      return;
    }

    requestPermissions((granted: boolean) => {
      if (granted) {
        const subscription = manager.onStateChange((state) => {
          if (state === "PoweredOn") {
            setBluetoothEnabled(true);
          } else {
            setBluetoothEnabled(false);
          }
        }, true);

        return () => {
          subscription.remove();
        };
      } else {
        showAlert("", t("permission_bluetooth_error"));
      }
    });
  }, []);

  useEffect(() => {
    if (!manager || !bluetoothEnabled) return;

    (async () => {
      if (!device.current) {
        await getLastDevice();
      }
    })();
  }, [bluetoothEnabled]);

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

  const showAlertConfirm = (title: string, message: string) =>
    Alert.alert(
      title,
      message,
      [
        {
          text: t("connect_now"),
          onPress: () => RootNavigation.navigate("PrinterScreen"),
          style: "default",
        },
      ],
      {
        cancelable: true,
      }
    );

  const setLastDevice = async (
    deviceId: string,
    service_uuid: string,
    characteristic_uuid: string
  ) => {
    await AsyncStorage.setItem("selectedPrinterDeviceId", deviceId);
    await AsyncStorage.setItem("selectedPrinterServiceUUID", service_uuid);
    await AsyncStorage.setItem(
      "selectedPrinterCharacteristicUUID",
      characteristic_uuid
    );
  };

  const getLastDevice = async () => {
    if (!manager) return;

    const storedDeviceId = await AsyncStorage.getItem(
      "selectedPrinterDeviceId"
    );
    if (storedDeviceId && bluetoothEnabled) {
      const storedServiceUUID = await AsyncStorage.getItem(
        "selectedPrinterServiceUUID"
      );
      const storedCharacteristicUUID = await AsyncStorage.getItem(
        "selectedPrinterCharacteristicUUID"
      );
      if (storedServiceUUID && storedCharacteristicUUID) {
        setPrintService({
          service_uuid: storedServiceUUID,
          characteristic_uuid: storedCharacteristicUUID,
        });
        try {
          const isConnected = await manager.isDeviceConnected(storedDeviceId);
          if (!isConnected) {
            await connectToDevice(storedDeviceId);
          }
        } catch (error) {
          console.error("Lỗi khi kiểm tra kết nối thiết bị:", error);
        }
      }
    }
  };

  const startScanning = () => {
    if (!manager) {
      console.error("BleManager không khả dụng");
      return;
    }

    setIsScanning(true);
    setDevices([]);

    try {
      manager.startDeviceScan(
        null,
        null,
        (error: Error | null, scannedDevice: Device | null) => {
          if (error) {
            console.error("Device scanning error:", error);
            setIsScanning(false);
            return;
          }
          if (scannedDevice && scannedDevice.name) {
            setDevices((prevDevices) => {
              if (
                !prevDevices.find((device) => device.id === scannedDevice.id)
              ) {
                return [...prevDevices, scannedDevice];
              }
              return prevDevices;
            });
          }
        }
      );

      setTimeout(() => {
        stopScanning();
        setIsScanning(false);
      }, 7000);
    } catch (error) {
      console.error("Lỗi khi bắt đầu quét thiết bị:", error);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (!manager) return;

    try {
      manager.stopDeviceScan();
    } catch (error) {
      console.error("Lỗi khi dừng quét thiết bị:", error);
    }
  };

  const selectDevice = async (deviceId: string): Promise<boolean> => {
    if (!manager) return false;
    return await connectToDevice(deviceId);
  };

  const findWorkingCharacteristic = async (
    device: Device,
    prefixText?: string
  ): Promise<InstructionType | null> => {
    if (!manager) return null;

    try {
      const receiptText = prefixText || "\n\nKet noi may in thanh cong!\n\n";
      const printData = new Uint8Array(receiptText.length);
      for (let i = 0; i < receiptText.length; i++) {
        printData[i] = receiptText.charCodeAt(i);
      }
      const base64PrintData = Buffer.from(printData).toString("base64");

      await device.discoverAllServicesAndCharacteristics();
      const services = await device.services();

      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const characteristic of characteristics) {
          const SERVICE_UUID = service.uuid;
          const CHARACTERISTIC_UUID = characteristic.uuid;
          try {
            await device.writeCharacteristicWithResponseForService(
              SERVICE_UUID,
              CHARACTERISTIC_UUID,
              base64PrintData
            );
            return { SERVICE_UUID, CHARACTERISTIC_UUID };
          } catch (error) {
            console.warn(
              `Failed to write to characteristic: ${CHARACTERISTIC_UUID} of ${SERVICE_UUID}`
            );
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi tìm đặc tính hoạt động:", error);
      return null;
    }
  };

  const connectToDevice = async (deviceId: string): Promise<boolean> => {
    if (!manager) return false;

    return new Promise<boolean>(async (resolve) => {
      if (deviceId !== device.current?.id) {
        try {
          const isConnected = await manager.isDeviceConnected(deviceId);
          let connectedDevice = isConnected
            ? connetedDevice[0]
            : await manager.connectToDevice(deviceId);

          const instruction = await findWorkingCharacteristic(
            connectedDevice,
            undefined
          );

          setConnetedDevice([connectedDevice]);

          if (instruction) {
            const { SERVICE_UUID, CHARACTERISTIC_UUID } = instruction;
            setPrintService({
              service_uuid: SERVICE_UUID,
              characteristic_uuid: CHARACTERISTIC_UUID,
            });
            device.current = connectedDevice;
            await setLastDevice(deviceId, SERVICE_UUID, CHARACTERISTIC_UUID);
            resolve(true);
          } else {
            console.error("No suitable service and characteristic found");
            resolve(false);
          }
        } catch (error) {
          console.error("Failed to connect to device:", error);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  };

  const printContent = async (base64Content = ""): Promise<boolean> => {
    if (!manager) return false;

    return new Promise<boolean>(async (resolve) => {
      const deviceId = await AsyncStorage.getItem("selectedPrinterDeviceId");
      if (deviceId && device.current && printService) {
        try {
          const isConnected = await manager.isDeviceConnected(deviceId);
          device.current = isConnected
            ? device.current
            : await manager.connectToDevice(deviceId);
          await device.current.discoverAllServicesAndCharacteristics();
          await device.current.writeCharacteristicWithResponseForService(
            printService.service_uuid,
            printService.characteristic_uuid,
            base64Content
          );
          resolve(true);
        } catch (error) {
          console.error("Failed to write to device:", error);
          resolve(false);
        }
      } else {
        showAlertConfirm("", t("no_connected_printer"));
        resolve(false);
      }
    });
  };

  const disconnectFromDevice = async (deviceId: string): Promise<void> => {
    if (!manager) return;

    try {
      await AsyncStorage.removeItem("selectedPrinterDeviceId");
      await AsyncStorage.removeItem("selectedPrinterServiceUUID");
      device.current = null;
      setConnetedDevice([]);
      await manager.cancelDeviceConnection(deviceId);
      await reloadBluetooth();
    } catch (error) {
      console.error("Failed to disconnect from device:", error);
    }
  };

  const reloadBluetooth = async (): Promise<void> => {
    if (!manager) return;

    try {
      await manager.disable();
      await manager.enable();
    } catch (error) {
      console.error("Failed to reload bluetooth:", error);
    }
  };

  // Cung cấp mock implementations nếu manager không khả dụng
  const mockFunctions = {
    startScanning: () => console.log("Mock scanning started"),
    stopScanning: () => console.log("Mock scanning stopped"),
    selectDevice: async () => false,
    disconnectFromDevice: async () => {},
    printContent: async () => false,
  };

  return (
    <BLEContext.Provider
      value={{
        manager,
        device,
        printService,
        devices,
        startScanning: manager ? startScanning : mockFunctions.startScanning,
        stopScanning: manager ? stopScanning : mockFunctions.stopScanning,
        isScanning,
        selectDevice: manager ? selectDevice : mockFunctions.selectDevice,
        connetedDevice,
        disconnectFromDevice: manager
          ? disconnectFromDevice
          : mockFunctions.disconnectFromDevice,
        printContent: manager ? printContent : mockFunctions.printContent,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
};

export const useBLE = () => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error("useBLE must be used within a BLEProvider");
  }
  return context;
};

export default BLEContext;
