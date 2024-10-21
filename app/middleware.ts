import { NextApiRequest, NextApiResponse } from "next";

// 미들웨어 함수 정의
export default function middleware(
  req: NextApiRequest,
  res: NextApiResponse,
  next: Function
) {
  // 요청 메서드와 URL 로깅
  console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);

  // 인증 예시 (여기서는 간단한 예시로, 실제 인증 로직을 추가해야 함)
  const authToken = req.headers["authorization"];
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 다음 미들웨어 또는 핸들러로 이동
  next();
}
