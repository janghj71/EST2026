import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // const env = loadEnv(mode, process.cwd(), "VITE_");
  const env = loadEnv(mode, "", "VITE_");

  // .env.dev 에서 VITE_API_HOST를 읽음 (없으면 기본값)
  const target = env.VITE_API_HOST || "http://estservice.goldauto.co.kr";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // request.js DEV 분기에서 /api + path 로 호출하므로 여기서 받아서 target으로 프록시
        "/api": {
          target,
          changeOrigin: true,
          // /api/est_step1.aspx -> /est_step1.aspx 로 바꿔서 서버에 전달
          rewrite: (path) => path.replace(/^\/api/, ""),
        },

        // Puppeteer 캡처 서버 (port 3001)
        "/capture-api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/capture-api/, ""),
        },

        // (선택) 다른 서비스들도 DEV에서 프록시로 탈 수 있게 하고 싶으면 추가
        "/neoservice": {
          target: env.VITE_NEOSERVICE || "http://neoservice.goldauto.co.kr",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/neoservice/, ""),
        },
        "/axservice": {
          target: env.VITE_AXSERVICE || "http://axservice.goldauto.co.kr",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/axservice/, ""),
        },
        "/ivservice": {
          target: env.VITE_IVSERVICE || "https://ivservice.intravan.co.kr",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ivservice/, ""),
        },
        "/tsservice": {
          target: env.VITE_TSSERVICE || "http://dev-ts.intravan.co.kr",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tsservice/, ""),
        },
      },
    },
  };
});


// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), tailwindcss()],
// })

