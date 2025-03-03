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

export const BLEProvider = ({ children }: { children: React.ReactNode }) => {
  const [manager, setManager] = useState<BleManager | null>(null);
  const device = useRef<Device | null>(null);
  const { t } = useTranslation();
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [printService, setPrintService] = useState<PrintService | null>(null);
  const [devices, setDevices] = useRecoilState<Device[]>(foundDevice);
  const [connetedDevice, setConnetedDevice] =
    useRecoilState<Device[]>(connectedDevice);
  const [isScanning, setIsScanning] = useRecoilState(deviceScan);

  // Khởi tạo BleManager trong useEffect
  useEffect(() => {
    let bleManagerInstance: BleManager | null = null;
    console.log("bleManagerInstance:", bleManagerInstance);

    try {
      // Chỉ khởi tạo trong môi trường di động thực
      if (Platform.OS === "android" || Platform.OS === "ios") {
        console.log("Đang khởi tạo BleManager với phiên bản 3.0.0...");
        bleManagerInstance = new BleManager();
        console.log("Khởi tạo bleManagerInstance:", bleManagerInstance);
        setManager(bleManagerInstance);
        console.log("Khởi tạo BleManager thành công");
      } else {
        console.log("Không khởi tạo BleManager (không phải thiết bị di động)");
      }
    } catch (error) {
      console.error("Không thể khởi tạo BleManager:", error);
    }

    // Cleanup khi component unmount
    return () => {
      if (bleManagerInstance) {
        try {
          bleManagerInstance.destroy();
        } catch (cleanupError) {
          console.error("Lỗi khi dọn dẹp BleManager:", cleanupError);
        }
      }
    };
  }, []);

  const requestPermissions = async (cb: (granted: boolean) => void) => {
    if (Platform.OS === "android") {
      try {
        // Yêu cầu quyền cần thiết cho Android
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,

          ...(Platform.Version >= 31
            ? [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              ]
            : []),
        ]);

        const allGranted = Object.values(grants).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );

        cb(allGranted);
      } catch (error) {
        console.error("Lỗi khi yêu cầu quyền:", error);
        cb(false);
      }
    } else {
      // iOS không cần yêu cầu quyền cho BLE như Android
      cb(true);
    }
  };

  useEffect(() => {
    requestPermissions((granted: boolean) => {
      if (granted) {
        const subscription = manager?.onStateChange((state) => {
          if (state === "PoweredOn") {
            setBluetoothEnabled(true);
          } else {
            setBluetoothEnabled(false);
          }
        }, true);

        return () => {
          subscription?.remove();
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
  }, [bluetoothEnabled, manager]);

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
    console.log("Bắt đầu hàm startScanning");

    if (!manager) {
      console.error("BleManager không khả dụng, không thể quét thiết bị");
      return;
    }

    console.log("BleManager khả dụng, tiếp tục quét");
    console.log("Đặt isScanning = true");
    setIsScanning(true);

    console.log("Xóa danh sách thiết bị đã tìm thấy trước đó");
    setDevices([]);

    try {
      console.log("Bắt đầu quét thiết bị với manager.startDeviceScan");
      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error: Error | null, scannedDevice: Device | null) => {
          if (error) {
            console.error("Lỗi quét thiết bị:", error);
            console.log("Đặt isScanning = false do lỗi");
            setIsScanning(false);
            return;
          }

          console.log(
            "Đã quét thiết bị:",
            scannedDevice
              ? {
                  id: scannedDevice.id,
                  name: scannedDevice.name,
                  rssi: scannedDevice.rssi,
                }
              : "null"
          );

          if (scannedDevice && scannedDevice.name) {
            console.log(
              `Thiết bị có tên: ${scannedDevice.name}, id: ${scannedDevice.id}`
            );
            setDevices((prevDevices) => {
              if (
                !prevDevices.find((device) => device.id === scannedDevice.id)
              ) {
                console.log(
                  `Thêm thiết bị mới: ${scannedDevice.name} vào danh sách`
                );
                return [...prevDevices, scannedDevice];
              }
              console.log(
                `Thiết bị ${scannedDevice.name} đã tồn tại trong danh sách`
              );
              return prevDevices;
            });
          } else {
            console.log("Thiết bị không có tên, bỏ qua");
          }
        }
      );

      console.log("Đặt timeout 7 giây để dừng quét");
      setTimeout(() => {
        console.log("Hết thời gian quét (7 giây), dừng quét");
        stopScanning();
        console.log("Đặt isScanning = false");
        setIsScanning(false);
      }, 7000);

      console.log("Đã cài đặt quét thành công");
    } catch (error) {
      console.error("Lỗi khi bắt đầu quét thiết bị:", error);
      console.log("Chi tiết lỗi:", JSON.stringify(error, null, 2));
      console.log("Đặt isScanning = false do exception");
      setIsScanning(false);
    }

    console.log("Kết thúc hàm startScanning");
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
  ): Promise<{ SERVICE_UUID: string; CHARACTERISTIC_UUID: string } | null> => {
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
              `Không thể ghi vào đặc tính: ${CHARACTERISTIC_UUID} của dịch vụ ${SERVICE_UUID}`
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
            console.error("Không tìm thấy dịch vụ và đặc tính phù hợp");
            resolve(false);
          }
        } catch (error) {
          console.error("Không thể kết nối với thiết bị:", error);
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
          console.error("Không thể ghi vào thiết bị:", error);
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
      await AsyncStorage.removeItem("selectedPrinterCharacteristicUUID");
      device.current = null;
      setConnetedDevice([]);
      await manager.cancelDeviceConnection(deviceId);
    } catch (error) {
      console.error("Không thể ngắt kết nối khỏi thiết bị:", error);
    }
  };

  // Cung cấp giá trị mặc định khi manager không khả dụng
  const mockFunctions = {
    startScanning: () => console.log("Mô phỏng: Bắt đầu quét"),
    stopScanning: () => console.log("Mô phỏng: Dừng quét"),
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
    throw new Error("useBLE phải được sử dụng trong BLEProvider");
  }
  return context;
};

export default BLEContext;
