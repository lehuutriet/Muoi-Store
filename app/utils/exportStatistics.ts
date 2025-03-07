// src/utils/exportStatistics.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// Interface cho dữ liệu thống kê thông thường
interface StatisticsData {
    reportType: string;
    timeFrame?: string;
    period?: string;
    totalRevenue?: number;
    totalProfit?: number;
    totalOrders?: number;
    paidOrders?: number;
    unpaidOrders?: number;
    avgOrderValue?: number;
    maxOrderValue?: number;
    minOrderValue?: number;
    morningRevenue?: number;
    noonRevenue?: number;
    eveningRevenue?: number;
    dineInRevenue?: number;
    takeAwayRevenue?: number;
    deliveryRevenue?: number;
    topProducts?: { text: string; value: number }[];
    startDate?: Date;
    endDate?: Date;
    // Thêm các trường mới
    revenueByDate?: { label: string; value: number }[];
    peakSellingTimes?: { label: string; value: number }[];

    // Các trường cho báo cáo đơn hàng trả lại
    isReturnReport?: boolean;
    totalReturns?: number;
    totalReturnValue?: number;
    returnReasons?: { text: string; value: number }[];
    returnedOrders?: {
        $id: string;
        returnDate?: string;
        $createdAt?: string;
        returnReason?: string;
        totalReturnAmount?: number;
        total?: number;
    }[];
}

// Hàm xuất CSV
export const exportToCSV = async (data: StatisticsData, translations: any) => {
    try {
        const t = translations;

        // Tạo nội dung CSV
        const BOM = "\uFEFF";
        let csvContent = BOM + `${data.reportType}\n\n`;

        // Phần nội dung khác nhau dựa trên loại báo cáo
        if (data.isReturnReport) {
            // Báo cáo đơn hàng trả lại
            csvContent += `${t("total_returns")},${data.totalReturns || 0}\n`;
            csvContent += `${t("total_return_value")},${Intl.NumberFormat("vi-VN").format(data.totalReturnValue || 0)}\n\n`;


            // Danh sách đơn hàng trả lại nếu có - thêm kiểm tra dữ liệu tồn tại
            if (data.returnedOrders && Array.isArray(data.returnedOrders) && data.returnedOrders.length > 0) {
                csvContent += `${t("returned_orders")}\n`;
                csvContent += `${t("order_id")},${t("date")},${t("amount")},${t("reason")}\n`;

                data.returnedOrders.forEach(order => {
                    const orderId = order.$id ? order.$id.slice(-4) : "-";
                    const date = order.returnDate ? new Date(order.returnDate).toLocaleDateString() :
                        (order.$createdAt ? new Date(order.$createdAt).toLocaleDateString() : "-");
                    const amount = Intl.NumberFormat("vi-VN").format(order.totalReturnAmount || order.total || 0);
                    const reason = order.returnReason || "-";

                    csvContent += `${orderId},${date},${amount},${reason}\n`;
                });
                csvContent += `\n`;
            } else {
                csvContent += `${t("returned_orders")}: ${t("no_data")}\n\n`;
            }
        } else {
            // Báo cáo doanh thu thông thường
            csvContent += `${data.period || ''}\n\n`;
            csvContent += `${t("total_revenue")},${Intl.NumberFormat("vi-VN").format(data.totalRevenue || 0)}\n`;
            csvContent += `${t("total_profit")},${Intl.NumberFormat("vi-VN").format(data.totalProfit || 0)}\n`;
            csvContent += `${t("total_orders")},${data.totalOrders || 0}\n`;
            csvContent += `${t("paid_orders")},${data.paidOrders || 0}\n`;
            csvContent += `${t("unpaid_orders")},${data.unpaidOrders || 0}\n\n`;

            csvContent += `${t("avg_order_value")},${Intl.NumberFormat("vi-VN").format(data.avgOrderValue || 0)}\n`;
            csvContent += `${t("max_order")},${Intl.NumberFormat("vi-VN").format(data.maxOrderValue || 0)}\n`;
            csvContent += `${t("min_order")},${Intl.NumberFormat("vi-VN").format(data.minOrderValue || 0)}\n\n`;

            csvContent += `${t("revenue_by_time_segment")}\n`;
            csvContent += `${t("morning")} (6h-12h),${Intl.NumberFormat("vi-VN").format(data.morningRevenue || 0)}\n`;
            csvContent += `${t("noon")} (12h-18h),${Intl.NumberFormat("vi-VN").format(data.noonRevenue || 0)}\n`;
            csvContent += `${t("evening")} (18h-22h),${Intl.NumberFormat("vi-VN").format(data.eveningRevenue || 0)}\n\n`;

            csvContent += `${t("revenue_by_location")}\n`;
            csvContent += `${t("dine_in")},${Intl.NumberFormat("vi-VN").format(data.dineInRevenue || 0)}\n`;
            csvContent += `${t("take_away")},${Intl.NumberFormat("vi-VN").format(data.takeAwayRevenue || 0)}\n`;
            csvContent += `${t("delivery")},${Intl.NumberFormat("vi-VN").format(data.deliveryRevenue || 0)}\n\n`;

            // Thêm doanh thu theo ngày (nếu có)
            if (data.revenueByDate && data.revenueByDate.length > 0) {
                csvContent += `${t("revenue_by_date")}\n`;
                data.revenueByDate.forEach(item => {
                    // Nếu nhãn là định dạng ngày tháng ngắn, thêm năm vào
                    const label = item.label.includes('/') && !item.label.includes('/' + new Date().getFullYear()) ?
                    `${item.label}/${new Date().getFullYear()}` : item.label;
                    csvContent += `${label},${Intl.NumberFormat("vi-VN").format(item.value)}\n`;
                });
                csvContent += `\n`;
            }

            // Thêm thời gian bán chạy
            if (data.peakSellingTimes && data.peakSellingTimes.length > 0) {
                csvContent += `${t("peak_selling_times")}\n`;
                data.peakSellingTimes.forEach(item => {
                    csvContent += `${item.label},${item.value}\n`;
                });
                csvContent += `\n`;
            }

            // Thêm thông tin sản phẩm bán chạy
            if (data.topProducts && data.topProducts.length > 0) {
                csvContent += `${t("top_selling_products")}\n`;
                data.topProducts.forEach((product, index) => {
                    csvContent += `${index + 1}. ${product.text},${product.value}\n`;
                });
            } else {
                csvContent += `${t("top_selling_products")}: ${t("no_data")}\n`;
            }
        }

            // Tạo tên file và đường dẫn
         // Thay vì dùng biểu thức chính quy loại bỏ tất cả ký tự không phải chữ và số
        let reportName = data.reportType;

        // Hoặc giữ nguyên tên tiếng Việt nhưng loại bỏ các ký tự không an toàn cho tên file
        let safeReportName = reportName.replace(/[\\/:*?"<>|]/g, '_');

        let fileName = `${safeReportName}_${new Date().toISOString().split('T')[0]}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;

        // Ghi file vào bộ nhớ thiết bị
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
            encoding: FileSystem.EncodingType.UTF8
        });

        // Kiểm tra và chia sẻ file
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: t("share_statistics"),
                UTI: 'public.comma-separated-values-text'
            });
            return true;
        } else {
            Alert.alert(t("sharing_not_available"), t("sharing_not_supported"));
            return false;
        }
    } catch (error) {
        console.error('Lỗi khi xuất file CSV:', error);
        return false;
    }
};