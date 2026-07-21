import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111215',
        }}
      >
        <span
          style={{
            fontSize: 108,
            fontWeight: 800,
            color: '#f59e0b',
            fontFamily: 'sans-serif',
          }}
        >
          T
        </span>
      </div>
    ),
    { ...size }
  );
}
