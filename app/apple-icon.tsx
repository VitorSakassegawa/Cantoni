import { ImageResponse } from 'next/og'

export const contentType = 'image/png'
export const size = {
  width: 180,
  height: 180,
}

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
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          color: 'white',
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: '-0.08em',
          borderRadius: 36,
        }}
      >
        C
      </div>
    ),
    size
  )
}
