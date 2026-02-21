# Kiến trúc hệ thống TMCP Flow

Dự án TMCP Flow (TikTok Flow Studio) là một ứng dụng full-stack phức tạp cho phép người dùng sinh tự động các sơ đồ quy trình dạng node-edge thông qua Prompt Text (sử dụng AI), chỉnh sửa thủ công (React Flow), đạo diễn camera (timeline & keyframes), và xuất kết quả cuối cùng thành video độ phân giải dọc HD (qua Remotion).

## 1. Tổng quan Kiến trúc (High-Level Architecture)

Dự án được chia làm 3 cụm module chính chạy song song:

### 1.1. Frontend (`src/`) — Bảng điều khiển Studio (React + Vite)
Giao diện người dùng trung tâm, nơi người dùng tương tác với hệ thống.
- **Công nghệ cốt lõi:** React 19, Vite, `@xyflow/react` (thư viện đồ họa cho node/edge), `react-router-dom`.
- **Pages chính:**
  - `FlowManager.jsx`: Trang quản lý luồng (lấy danh sách, import JSON, tạo mới, version control history).
  - `Studio.jsx`: Giao diện thiết kế (Canvas) đã được module hóa (tách hàm, tách logic ra các file con). Bao gồm:
    - AI Prompt sidebar để sinh sơ đồ.
    - React Flow canvas chỉnh sửa cấu trúc (Blueprint).
    - Màn hình thiết lập Keyframe timeline di chuyển góc máy (Directing).
    - Cấu hình các hiệu ứng hình ảnh (FX).
    - Thiết lập Export Video (Render presets, progress UI).

### 1.2. Render Engine Backend (`server/`) — Trình xuất Video (Express)
Máy chủ trung gian kết nối giữa React UI tĩnh và lõi Render Video.
- **Công nghệ cốt lõi:** Node.js, Express, `@remotion/renderer` (phiên bản 4), `better-sqlite3`.
- **Chức năng:**
  - **Chứa cơ sở dữ liệu (SQLite):** Lưu trữ metadata flow (`flows` table) và lịch sử chỉnh sửa (`flow_versions` table) trong file `server/data/flows.db`.
  - **Render API:** Chạy CLI command khởi tạo trình duyệt ẩn headless (Chromium) qua `renderMedia()` để xuất video MP4 dọc từ JSON state cấu trúc node. Cung cấp API SSE stream real-time báo % render.
  - Cung cấp tính năng CLI batch-rendering thông qua tệp độc lập `scripts/render-cli.ts`.

### 1.3. AI Backend (`ai-server/`) — Xử lý Ngôn ngữ & Tạo cấu trúc (FastAPI)
Microservice bằng Python đảm nhiệm chức năng nhận "Prompt con chữ" và chuyển đổi logic thành "Tọa độ cấu trúc React Flow JSON".
- **Công nghệ cốt lõi:** Python, FastAPI, LangGraph (dàn xếp luồng AI xử lý ngữ nghĩa), LLM Models.
- **Quy trình hoạt động (AI Pipeline):** Khai báo tại `pipeline.py`, luồng đi qua 3 bước (Node LLM):
  1. `analyze_prompt`: Phân tích ý định người dùng (Xác định các modules tham gia, ví dụ: "Docker", "ArgoCD"...).
  2. `generate_flow_data`: Ánh xạ modules ra JSON Nodes/Edges hợp lệ chuẩn ngõ ra ReactFlow.
  3. `evaluate_output`: Thẩm định chéo (Cross-eval) nếu logic có lỗi vòng lặp/thiếu thông tin thì điều hướng chạy loop lại node 2 để khắc phục (`should_retry`).
- SSE streaming trạng thái cụ thể của từng node (`Tâm phân tích...` -> `Đang sinh sơ đồ...` -> `Thẩm định...`).

---

## 2. Luồng dữ liệu chính (Data Flows)

### 2.1. Luồng thiết kế thủ công & Lưu trữ State
1. Người dùng thao tác kéo thả node, sửa tiêu đề, nối cạnh trên React Flow Canvas (`Studio.jsx`). State sẽ được cập nhật tạm thời ở client (`useNodesState`, `useEdgesState`).
2. Nhấn nút "Save Version": Frontend POST toàn bộ objects `nodes`, `edges`, và `cameraSequence` qua API trung gian vào `/api/flows/:id/versions` (Node.js Server).
3. Server nhận data, lấy ảnh đại diện Thumbnail (base64 PNG) và Commit bản lưu vào bảng `flow_versions` của SQLite Database dưới dạng chuỗi Text (stringify JSON).

### 2.2. Luồng tạo tự động (Generative AI Flow)
1. User nhập nội dung đoạn chat vào "AI Flow Prompt" (ví dụ: *"GitOps pipeline với Kubernetes"*).
2. Frontend `Studio.jsx` mở kết nối Server-sent Events (SSE) `/api/ai/generate` đến `ai-server` (Port 8000).
3. LangGraph Pipeline (Python) phân tách công việc, xử lý JSON, và trả lại tọa độ gốc.
4. Payload JSON (từ AI JSON parse) cập bến mảng State `nodes_result` và `edges_result` trong hàm streaming.
5. Server lưu nháp payload sinh ra vào tệp local SQLite `flow_records.db` dành cho AI. Frontend chạy Layout Algorithm (ELK Layout Node JS `elkjs`) ngay tại Client để sắp xếp lại các nodes vào những tọa độ x, y gọn gàng thay vì x:0, y:0 ban đầu của AI, hiển thị ra Canvas.

### 2.3. Luồng Rendering Video (Remotion Export Flow)
1. Người dùng ấn chọn chất lượng preset (Draft, Standard, High, ProRes) tại màn hình Render (`Studio.jsx`) và nhấn **Export MP4**.
2. Frontend gọi POST đến Backend Render `/api/render-stream` (Port 3000), đưa theo State chứa: `nodes`, `edges`, `cameraSequence`, cùng config (resolution, framerate).
3. Endpoint Express mở `selectComposition()` của Remotion để đo độ phân giải/thời lượng.
4. Gọi hàm cốt lõi `@remotion/renderer/renderMedia` có tối ưu hóa phần cứng (HW VideoToolbox, chia nhỏ CPU Threads, GPU Angle) dựa vào máy chủ đang đặt OS.
5. Trình duyệt Headless Chromium mở Component React tĩnh `DynamicFlowScene.jsx` ảo với state JSON nhận được, quay lại hành vi ReactFlow, chụp hình 60 frame JPEG mỗi giây. Liên tục ping ngược tiến trình (%) về cho Studio.jsx qua kết nối Event Source.
6. Gom các bức ảnh và đóng gói encode MP4 h264 tại folder `out/`.
7. Gửi URL file tải về cục bộ.

---

## 3. Thành phần thư mục quan trọng

- `ai-server/`
  - `main.py`: Bootstrapper mở ngõ FastAPI và các routes.
  - `pipeline.py`: Kiến trúc Workflow Agent do Langgraph biên đạo (State Machine AI).
  - `models.py`: Khai báo Type, Interface của dữ liệu cho quy chuẩn Pydantic.
- `server/`
  - `server.js`: Trái tim DB SQLite + Remotion Render API backend.
- `scripts/`
  - `render-cli.ts`: Tiện ích dòng lệnh chạy xuất hàng loạt các scenario JSON dựng video nếu không mở Website.
- `src/`
  - `components/UniversalNode.jsx`: Custom node của React Flow. Thiết kế UI Node cho các chức năng trong app.
  - `components/ViralEdge.jsx`: Custom edge chứa các logic CSS SVG draw-path Animations (Ví dụ chớp Neon Path, Laser, Bolt).
  - `components/DynamicFlowScene.jsx`: Trình đọc state trung gian Wrapper "Trơ" (Vô hiệu hóa UI Kéo thả, chỉ hiển thị UI tĩnh) chuyên dùng để pass vào `Remotion Root` chụp hình.
  - `remotion/RemotionRoot.jsx`: Component gốc `export` duy nhất `registerRoot` để bộ Bundle của Remotion nhận diện cấu trúc tệp Video.
  - `constants/flowConstants.js`: Khai báo các hằng số, node/edge ban đầu và cấu hình mặc định cho Studio.
  - `utils/autoDirect.js`: Thuật toán Cinematic Auto Direct tự động tạo chuỗi keyframe camera đi theo luồng cạnh.
  - `utils/exportUtils.js`: Chứa tiện ích chụp ảnh màn hình thumbnail và lưu file JSON.
  - `utils/flowUtils.js`: Các hàm tiện ích bổ trợ cho logic của layout, chuẩn hóa nodes/edges.
  - `utils/elkLayout.js`: Thuật toán máy tính đồ thị Elkjs để sắp xếp các node thành sơ đồ logic khi AI trả kết quả về có tọa độ không khớp.
