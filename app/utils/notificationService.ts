// Tạo một dịch vụ thông báo trong utils/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Cài đặt cấu hình thông báo
export const setupNotifications = async () => {
  // Yêu cầu quyền
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }

  // Cấu hình thông báo
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  return true;
};

// Lên lịch thông báo nhắc nhở
export const scheduleNotification = async (
  title: string,
  body: string,
  date: Date,
  data: any = {}
) => {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: date,
    });
    
    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Hủy thông báo đã lên lịch
export const cancelScheduledNotification = async (identifier: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

// Hủy tất cả thông báo
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
};