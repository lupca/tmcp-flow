# Tối ưu hiệu suất xuất video Remotion (Performance Optimization)

Tài liệu này ghi lại các kỹ thuật tối ưu hóa đã được áp dụng để tăng cường hiệu suất xuất (render) video MP4/MOV từ React Flow sử dụng Remotion v4.0.422.

## Bối cảnh & Cấu hình phần cứng

- **Core Engine:** `@remotion/renderer` (phiên bản `4.0.422`)
- **Độ phân giải / FPS:** 1080x1920 (dọc), 60 FPS
- **Phần cứng mục tiêu:** Apple M4 (10 CPU cores, tích hợp Apple Silicon Media Engine)

## 6 Kỹ thuật tối ưu hóa chính

### 1. Hardware-Accelerated Encoding (VideoToolbox)
- **Cấu hình:** `hardwareAcceleration: 'if-possible'`
- **Tác động:** 🔥🔥🔥 Tăng tốc độ encode lên gấp 3-5 lần bằng cách sử dụng chip phần cứng chuyên biệt (Apple VideoToolbox) thay vì encode bằng phần mềm CPU.
- **Lưu ý:** Bắt buộc phải chuyển từ Variable Bitrate (CRF) sang Constant Bitrate (CBR) bằng thuộc tính `videoBitrate`.

### 2. Chrome Tab Concurrency (Xử lý song song)
- **Cấu hình:** `concurrency` dựa trên preset chất lượng và cấu hình phần cứng:
  - Draft: `Math.max(2, Math.floor(os.cpus().length * 0.75))`
  - Standard/ProRes: `Math.max(2, Math.floor(os.cpus().length / 2))`
  - High: `Math.max(2, Math.floor(os.cpus().length / 3))`
- **Tác động:** 🔥🔥🔥 Tăng tốc độ render các khung hình (frames) HTML bằng cách mở song song nhiều tab headless Chrome.
- **Lưu ý:** Không nên mở quá nhiều tab (vượt mức cho phép của RAM/CPU), gây nghẽn cổ chai (bottleneck), do đó công thức an toàn là chia đôi số core thực tế.

### 3. GPU Rendering (Angle backend)
- **Cấu hình:** `chromiumOptions: { gl: 'angle' }`
- **Tác động:** 🔥🔥 Kích hoạt WebGL backend cho Chromium chạy nền. Giúp các hiệu ứng phức tạp (ví dụ: filter SVG, đổ bóng mờ nền - CSS backdrop-filter) được GPU của M4 chịu tải thay vì sử dụng CPU software renderer.

### 4. Định dạng khung hình JPEG (JPEG Frames)
- **Cấu hình:** `imageFormat: 'jpeg'`, `jpegQuality: 85-95`
- **Tác động:** 🔥🔥 Remotion lấy mẫu từng frame UI dưới dạng chuỗi hình ảnh. Định dạng JPEG mã hóa cực kỳ nhanh và có dung lượng nhẹ hơn nhiều so với PNG (mặc định), giúp giảm thiểu "cổ chai I/O" đọc/ghi liên tục khi render video.

### 5. Chất lượng Preset (Quality Presets)
Cho phép người dùng kiểm soát cán cân giữa chất lượng (Quality) và tốc độ (Speed):
- **Draft ⚡:** Bitrate `2M`, JPEG 70, Concurrency Tối đa (Nhanh nhất, phù hợp review nhanh)
- **Standard 🎬:** Bitrate `8M`, JPEG 85, Concurrency 50% CPU (Cân bằng tốt nhất - Khuyên dùng)
- **High 💎:** Bitrate `15M`, JPEG 95, Concurrency 33% CPU (Rất nét, nhưng file lớn, chậm)
- **ProRes 🎞️:** `codec: 'prores-hq'` (Phục vụ hậu kỳ, mã hóa cực nhanh nhưng kích thước file rất lớn, không hỗ trợ JPEG frames).

### 6. Streaming SSE & Hủy tác vụ (Cancelation)
- **SSE Stream (`/api/render-stream`):** Chuyển từ API chặn luồng xử lý (blocking API) thành Server-Sent Events (SSE). Client nhận % tiến độ liên tục, có kèm dự đoán ETA (thời gian ước tính hoàn thành).
- **Hủy mềm (Soft Cancel):** API `/api/render/cancel` cho phép thay đổi flag vòng lặp `activeRender.aborted`, ngăn backend tiếp tục ngốn tài nguyên nếu người dùng đổi ý.

---

## File nguồn đã thay đổi

Việc tối ưu hóa được triển khai đồng bộ ở 3 cấp độ:

1. **Server API (`server/server.js`)**: Điểm cuối `/api/render-stream` chịu trách nhiệm cấu hình `renderMedia()` với đầy đủ các tweaks kể trên cho giao diện UI.
2. **CLI (`scripts/render-cli.ts`)**: Tối ưu quá trình render tự động hàng loạt cấu hình file JSON mà không cần mở UI. Tích hợp thanh `process.stdout` progress bar ETA.
3. **UI / Frontend (`src/pages/Studio.jsx`)**: Tích hợp các nút chọn preset chất lượng, lắng nghe SSE hook, hiển thị progress bar và nút huỷ tác vụ trên tab *Render* của Flow Studio.
