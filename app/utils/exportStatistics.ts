// src/utils/exportStatistics.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import * as ExcelJS from 'exceljs';
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
        
        // Sử dụng ExcelJS để tạo file Excel thực sự thay vì CSV
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Muối Store';
        workbook.lastModifiedBy = 'Muối Store';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // Tạo sheet báo cáo
        const worksheet = workbook.addWorksheet('Báo cáo');
        
        // Thiết lập tiêu đề báo cáo
        const titleRow = worksheet.addRow([data.reportType.toUpperCase()]);
        // Định dạng tiêu đề
        titleRow.font = { bold: true, size: 16 };
        worksheet.mergeCells('A1:G1');
        titleRow.alignment = { horizontal: 'center' };
        
        // Thêm dòng trống
        worksheet.addRow([]);
        
        if (data.isReturnReport) {
            // Báo cáo đơn hàng trả lại
            // Thêm header cho bảng
            const headerRow = worksheet.addRow([
                t("STT"), t("order_id"), t("date"), t("reason"), t("amount")
            ]);
            
            // Định dạng header
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF00' } // Màu vàng
                };
                cell.font = { bold: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center' };
            });
            
            // Thêm dữ liệu đơn hàng trả lại
            if (data.returnedOrders && Array.isArray(data.returnedOrders) && data.returnedOrders.length > 0) {
                data.returnedOrders.forEach((order, index) => {
                    const orderId = order.$id ? order.$id.slice(-4) : "-";
                    const date = order.returnDate ? new Date(order.returnDate).toLocaleDateString("vi-VN") :
                        (order.$createdAt ? new Date(order.$createdAt).toLocaleDateString("vi-VN") : "-");
                    const reason = order.returnReason || "-";
                    const amount = order.totalReturnAmount || order.total || 0;
                    
                    const row = worksheet.addRow([
                        index + 1,
                        orderId,
                        date,
                        reason,
                        amount
                    ]);
                    
                    // Định dạng số tiền
                    row.getCell(5).numFmt = '#,##0';
                    
                    // Thêm border
                    row.eachCell(cell => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });
            }
            
            // Thêm dòng tổng kết
            worksheet.addRow([]);
            const summaryRow1 = worksheet.addRow([t("total_returns"), data.totalReturns || 0]);
            const summaryRow2 = worksheet.addRow([t("total_return_value"), data.totalReturnValue || 0]);
            summaryRow2.getCell(2).numFmt = '#,##0';
            
        } else {
            // Báo cáo doanh thu/đơn hàng
            // Thêm ngày báo cáo
            const periodRow = worksheet.addRow([t("period"), data.period || '']);
            worksheet.addRow([]);
            
            // Tạo bảng dữ liệu chính
            const headerRow = worksheet.addRow([
                t("metric"), t("value")
            ]);
            
            // Định dạng header
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF00' } // Màu vàng
                };
                cell.font = { bold: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center' };
            });
            
            // Thêm dữ liệu tổng quan
            const rows = [
                [t("total_revenue"), data.totalRevenue || 0],
                [t("total_profit"), data.totalProfit || 0],
                [t("total_orders"), data.totalOrders || 0],
                [t("paid_orders"), data.paidOrders || 0],
                [t("unpaid_orders"), data.unpaidOrders || 0]
            ];
            
            rows.forEach(rowData => {
                const row = worksheet.addRow(rowData);
                if (rowData[0] === t("total_revenue") || rowData[0] === t("total_profit")) {
                    row.getCell(2).numFmt = '#,##0';
                }
                
                // Thêm border
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            
            // Thêm dòng trống
            worksheet.addRow([]);
            
            // Thêm bảng chi tiết đơn hàng
            worksheet.addRow([t("order_details")]).font = { bold: true };
            const orderDetailsHeader = worksheet.addRow([
                t("metric"), t("value")
            ]);
            
            // Định dạng header
            orderDetailsHeader.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF00' }
                };
                cell.font = { bold: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center' };
            });
            
            const orderDetails = [
                [t("avg_order_value"), data.avgOrderValue || 0],
                [t("max_order"), data.maxOrderValue || 0],
                [t("min_order"), data.minOrderValue || 0]
            ];
            
            orderDetails.forEach(rowData => {
                const row = worksheet.addRow(rowData);
                row.getCell(2).numFmt = '#,##0';
                
                // Thêm border
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            
            // Thêm dòng trống
            worksheet.addRow([]);
            
            // Thêm bảng doanh thu theo khung giờ
            worksheet.addRow([t("revenue_by_time_segment")]).font = { bold: true };
            const timeHeader = worksheet.addRow([
                t("time_segment"), t("revenue")
            ]);
            
            // Định dạng header
            timeHeader.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF00' }
                };
                cell.font = { bold: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center' };
            });
            
            const timeData = [
                [t("morning") + " (6h-12h)", data.morningRevenue || 0],
                [t("noon") + " (12h-18h)", data.noonRevenue || 0],
                [t("evening") + " (18h-22h)", data.eveningRevenue || 0]
            ];
            
            timeData.forEach(rowData => {
                const row = worksheet.addRow(rowData);
                row.getCell(2).numFmt = '#,##0';
                
                // Thêm border
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            
            // Tương tự, thêm các bảng khác như doanh thu theo khu vực, top sản phẩm, v.v.
            worksheet.addRow([]);
            
            // Bảng doanh thu theo khu vực
            worksheet.addRow([t("revenue_by_location")]).font = { bold: true };
            const locationHeader = worksheet.addRow([
                t("location"), t("revenue")
            ]);
            
            // Định dạng header
            locationHeader.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF00' }
                };
                cell.font = { bold: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center' };
            });
            
            const locationData = [
                [t("dine_in"), data.dineInRevenue || 0],
                [t("take_away"), data.takeAwayRevenue || 0],
                [t("delivery"), data.deliveryRevenue || 0]
            ];
            
            locationData.forEach(rowData => {
                const row = worksheet.addRow(rowData);
                row.getCell(2).numFmt = '#,##0';
                
                // Thêm border
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            
            // Thêm sản phẩm bán chạy nếu có
            if (data.topProducts && data.topProducts.length > 0) {
                worksheet.addRow([]);
                worksheet.addRow([t("top_selling_products")]).font = { bold: true };
                const productHeader = worksheet.addRow([
                    t("rank"), t("product"), t("quantity")
                ]);
                
                // Định dạng header
                productHeader.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFF00' }
                    };
                    cell.font = { bold: true };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = { horizontal: 'center' };
                });
                
                data.topProducts.forEach((product, index) => {
                    const row = worksheet.addRow([
                        index + 1,
                        product.text,
                        product.value
                    ]);
                    
                    // Thêm border
                    row.eachCell(cell => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });
            }
        }
        
        // Thiết lập độ rộng cột
        worksheet.columns.forEach(column => {
            column.width = 20;
        });
        
        // Xuất file Excel
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Chuyển buffer thành chuỗi base64
        const base64 = arrayBufferToBase64(buffer);
        
        // Tạo tên file
        const fileName = `${data.reportType.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        // Ghi file vào bộ nhớ thiết bị
        await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64
        });
        
        // Kiểm tra và chia sẻ file
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: t("share_statistics"),
                UTI: 'org.openxmlformats.spreadsheetml.sheet'
            });
            return true;
        } else {
            Alert.alert(t("sharing_not_available"), t("sharing_not_supported"));
            return false;
        }
    } catch (error) {
        console.error('Lỗi khi xuất file Excel:', error);
        return false;
    }
};

// Hàm phụ trợ để chuyển đổi ArrayBuffer thành Base64
function arrayBufferToBase64(buffer:any) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}