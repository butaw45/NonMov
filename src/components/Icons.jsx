// Ikon SVG digambar tangan — stroke konsisten 1.8, tanpa library ikon.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Svg = ({ size = 18, children, filled = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    {...(filled ? { fill: 'currentColor' } : base)}
  >
    {children}
  </svg>
)

export const IconPlay = (p) => (
  <Svg {...p} filled>
    <path d="M7.2 4.6v14.8a.6.6 0 0 0 .92.5l11.5-7.4a.6.6 0 0 0 0-1L8.12 4.1a.6.6 0 0 0-.92.5z" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M4.5 12.6l4.8 4.9L19.5 6.5" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20.4 20.4L16 16" />
  </Svg>
)

export const IconStar = (p) => (
  <Svg {...p} filled>
    <path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8z" />
  </Svg>
)

export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M4 10.6L12 3.6l8 7" />
    <path d="M6 9v11h4.4v-6.2h3.2V20H18V9" />
  </Svg>
)

export const IconCompass = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1z" />
  </Svg>
)

export const IconFilm = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M7.5 4.5v15M16.5 4.5v15M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4" />
  </Svg>
)

export const IconTv = (p) => (
  <Svg {...p}>
    <rect x="3" y="6.8" width="18" height="12" rx="2" />
    <path d="M9.5 21.5h5M8.5 3.5L12 6.8l3.5-3.3" />
  </Svg>
)

export const IconBookmark = (p) => (
  <Svg {...p}>
    <path d="M6.5 3.5h11V21L12 16.7 6.5 21z" />
  </Svg>
)

export const IconChevronL = (p) => (
  <Svg {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Svg>
)

export const IconChevronR = (p) => (
  <Svg {...p}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </Svg>
)

export const IconArrowL = (p) => (
  <Svg {...p}>
    <path d="M20 12H4M10.5 5.5L4 12l6.5 6.5" />
  </Svg>
)

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const IconExt = (p) => (
  <Svg {...p}>
    <path d="M13.5 4.5h6v6M19.5 4.5l-9 9" />
    <path d="M19.5 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h5" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 4L2.9 19.6h18.2L12 4z" />
    <path d="M12 10v4.2M12 17.2v.4" />
  </Svg>
)
